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
const getType = (type: any): string => {
  let typeName;

  if (typeof type === "function") {
    try {
      return getType(type());
    } catch (e) {
      return type.toString().split("() => ")[1];
    }
  } else if (type.name) {
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
  // We can't chain this the other way (i.e. RealmTypes.string().optional()), which
  // might feel more natural, because we are claiming that `string()` returns a `string`,
  // even if it is really an instance of RealmTaggedMember at this point
  optional: () => {
    return RealmTypesFactory<undefined>(true);
  },

  list: <T extends Function>(
    type: T,
    defaultValue: (T extends () => any ? ReturnType<T> : never)[] = []
  ) => {
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

  dictionary: <T extends Function>(
    valueType: T,
    defaultValue = {} as Record<
      string,
      T extends () => any ? ReturnType<T> : never
    >
  ) => {
    return new RealmTaggedMember(
      `${getType(valueType)}{}`,
      optional,
      defaultValue
    ) as any as Realm.Dictionary<T> | OtherT;
  },

  // Really this should be a Realm.Set not a JS Set
  set: <T extends Function>(
    type: T
    // defaultValue = new Set<T extends () => any ? ReturnType<T> : never>()
  ) => {
    return new RealmTaggedMember(
      `${getType(type)}<>`,
      optional,
      undefined
      // defaultValue
    ) as any as Realm.Set<T> | OtherT;
  },
});

/**
 * The default RealmTypes factory that users interact with
 */
export const RealmTypes = RealmTypesFactory(false);

export function makeRealmClass<T extends Record<string, any>>(
  name: string,
  properties: T
): {
  new (...args: any[]): Realm.Object & {
    // TODO can this be made nicer?
    [P in keyof T]: T[P] extends () => infer R
      ? R extends abstract new (...args: any) => any
        ? InstanceType<R>
        : unknown
      : T[P] extends Array<() => infer R>
      ? R extends abstract new (...args: any) => any
        ? Array<InstanceType<R>>
        : unknown
      : T[P] extends Realm.Dictionary<() => infer R>
      ? R extends abstract new (...args: any) => any
        ? Realm.Dictionary<InstanceType<R>>
        : unknown
      : T[P] extends Realm.Set<() => infer R>
      ? R extends abstract new (...args: any) => any
        ? Realm.Set<InstanceType<R>>
        : unknown
      : T[P];
  };
  schema: any;
} {
  const schema = Object.keys(properties).reduce(
    (schemaObj, propertyKey) => {
      schemaObj.properties[propertyKey] = properties[propertyKey].schemaType;
      return schemaObj;
    },
    { properties: {} as Record<string, string>, name }
  );

  return class extends Realm.Object {
    constructor() {
      super();

      for (let [k, v] of Object.entries(properties)) {
        (this as any)[k] = v.originalValue;
      }
    }

    static schema = schema;
  } as any;
}
