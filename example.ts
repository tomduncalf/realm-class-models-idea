import Realm from "realm";

/**
 * Represents the details of a member of a Realm class based model.
 * Users do not see or interact with this class, as `makeRealmObject`
 * will replace it with `originalValue`.
 */
class RealmTaggedMember<T> {
  constructor(
    private _schemaType: string,
    private _optional: boolean,
    public originalValue: T
  ) {}

  get schemaType(): string {
    return `${this._schemaType}${this._optional ? "?" : ""}`;
  }
}

/**
 * Base class for a Realm object, could have more interesting stuff on it
 */
class RealmObject {
  schema: any = {};
}

/**
 * Get the Realm schema type name of either a class or a RealmType passed in when
 * creating an array, set or dictionary.
 *
 * e.g. if you pass in `MyClass`, it will return "MyClass". If you pass in
 * `RealmTypes.number()`, it will return "number"
 */
const getType = (type: any) => {
  let typeName;

  if (type.name) {
    return type.name;
  } else if (type.__proto__ && type.__proto__.name) {
    return type.__proto__.name;
  } else if (type instanceof RealmTaggedMember) {
    return type.schemaType;
  } else {
    console.log(type);
    throw new Error("Could not determine type");
  }
};

/**
 * Factory which creates an object containing factories for the Realm data types.
 * Users call these factories in their class, then `makeRealmObject` swaps them out
 * for normal values and constructs the schema.
 *
 * @param optional If true, returns a new factory with all types made optional
 * @returns
 */
const RealmTypesFactory = <OtherT = never>(optional = false) => ({
  optional: () => {
    return RealmTypesFactory<undefined>(true);
  },

  list: <T>(type: T, defaultValue: T[] = []) => {
    return new RealmTaggedMember(
      `${getType(type)}[]`,
      optional,
      defaultValue
    ) as any as
      | Array<
          T extends abstract new (...args: any) => any ? InstanceType<T> : T
        >
      | OtherT;
  },

  int: (defaultValue = 0) => {
    return new RealmTaggedMember("int", optional, defaultValue) as any as
      | number
      | OtherT;
  },

  float: (defaultValue = 0) => {
    return new RealmTaggedMember("float", optional, defaultValue) as any as
      | number
      | OtherT;
  },

  double: (defaultValue = 0) => {
    return new RealmTaggedMember("double", optional, defaultValue) as any as
      | number
      | OtherT;
  },

  string: (defaultValue = "") => {
    return new RealmTaggedMember("string", optional, defaultValue) as any as
      | string
      | OtherT;
  },

  bool: (defaultValue = false) => {
    return new RealmTaggedMember("bool", optional, defaultValue) as any as
      | boolean
      | OtherT;
  },

  mixed: <T = unknown>(defaultValue = undefined) => {
    return new RealmTaggedMember("mixed", optional, defaultValue) as any as
      | T
      | OtherT;
  },

  // Really this should be a Realm.Dictionary not a JS Map
  dictionary: <T>(valueType: T, defaultValue = new Map<string, T>()) => {
    return new RealmTaggedMember(
      `${getType(valueType)}{}`,
      optional,
      defaultValue
    ) as any as Map<string, T> | OtherT;
  },

  // Really this should be a Realm.Set not a JS Set
  set: <T>(type: T, defaultValue = new Set<T>()) => {
    return new RealmTaggedMember(
      `${getType(type)}<>`,
      optional,
      defaultValue
    ) as any as Set<T> | OtherT;
  },
});

/**
 * The default RealmTypes factory that users interact with
 */
const RealmTypes = RealmTypesFactory(false);

/**
 * Converts a class instance with RealmType properties into an instance
 * with those properties replaced with normal JS types, and a Realm schema
 * describing those properties added to the instance.
 *
 * This must be called in the constructor of any class which has RealmType
 * properties.
 *
 * @param _this The instance to convert
 */
function makeRealmObject(_this: any) {
  _this.schema = { name: _this.constructor.name, properties: {} };

  for (const key of Object.getOwnPropertyNames(_this)) {
    if (!(_this[key] instanceof RealmTaggedMember)) {
      continue;
    }

    _this.schema.properties[key] = _this[key].schemaType;
    _this[key] = _this[key].originalValue;
  }
}

/**
 * Example class with a variety of types
 */
class MyClass extends RealmObject {
  listOfMyClass = RealmTypes.list(MyClass);
  listOfInts = RealmTypes.list(RealmTypes.int(), [1, 2, 3]);
  int = RealmTypes.int(3);
  float = RealmTypes.float();
  double = RealmTypes.double();
  string = RealmTypes.string();
  // We can't chain this the other way (i.e. RealmTypes.string().optional()), which
  // might feel more natural, because we are claiming that `string()` returns a `string`,
  // even if it is really an instance of RealmTaggedMember at this point
  optionalString = RealmTypes.optional().string();
  mixed = RealmTypes.mixed();
  dictionaryOfMyClass = RealmTypes.dictionary(MyClass);
  dictionaryOfMixed = RealmTypes.dictionary(RealmTypes.mixed);
  setOfMyClass = RealmTypes.set(MyClass);
  setOfStrings = RealmTypes.set(RealmTypes.string);

  // A property which is not persisted in Realm
  nonRealmProperty = 0;

  constructor() {
    super();
    makeRealmObject(this);
  }

  getDoubleInt = () => {
    return this.int * 2;
  };
}

const myInstance = new MyClass();

console.log(myInstance.schema);

/**
 * Outputs this Realm schema:
 *
 * {
 *   name: 'MyClass',
 *   properties: {
 *     listOfMyClass: 'MyClass[]',
 *     listOfInts: 'int[]',
 *     int: 'int',
 *     float: 'float',
 *     double: 'double',
 *     string: 'string',
 *     optionalString: 'string?',
 *     mixed: 'mixed',
 *     dictionaryOfMyClass: 'MyClass{}',
 *     dictionaryOfMixed: 'mixed{}',
 *     setOfMyClass: 'MyClass<>',
 *     setOfStrings: 'string<>'
 *   }
 * }
 */

console.log(myInstance);

/**
 * Outputs this, note that all the class members are now the underlying JS types:
 *
 * MyClass {
 *   schema: {
 *     ...
 *   },
 *   listOfMyClass: [],
 *   listOfInts: [ 1, 2, 3 ],
 *   int: 3,
 *   float: 0,
 *   double: 0,
 *   string: '',
 *   optionalString: '',
 *   mixed: undefined,
 *   dictionaryOfMyClass: Map(0) {},
 *   dictionaryOfMixed: Map(0) {},
 *   setOfMyClass: Set(0) {},
 *   setOfStrings: Set(0) {},
 *   nonRealmProperty: 0,
 *   getZDouble: [Function (anonymous)]
 * }
 */

/**
 * I guess ideally users could write something like:
 *
 * const realm = new Realm({ schema: [MyClass] });
 *
 * and under the hood, Realm would create a temporary new instance
 * of MyClass in order to be able to get its schema. Maybe this is OK
 * as long as the constructor has no side effects?
 */
