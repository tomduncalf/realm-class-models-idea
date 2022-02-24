import Realm from "realm";

class RealmTaggedMember {
  constructor(public schemaType: string, public originalValue: any) {}
}

class RealmObject {
  // schema: any = {};

  static schema: any = {};
}

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

const RealmTypes = {
  array: <T>(type: T, defaultValue: T[] = []) => {
    return new RealmTaggedMember(
      `${getType(type)}[]`,
      defaultValue
    ) as any as Array<
      T extends abstract new (...args: any) => any ? InstanceType<T> : T
    >;
  },

  int: (defaultValue = 0) => {
    return new RealmTaggedMember("int", defaultValue) as any as number;
  },

  float: (defaultValue = 0) => {
    return new RealmTaggedMember("float", defaultValue) as any as number;
  },

  double: (defaultValue = 0) => {
    return new RealmTaggedMember("double", defaultValue) as any as number;
  },

  string: (defaultValue = "") => {
    return new RealmTaggedMember("string", defaultValue) as any as string;
  },

  bool: (defaultValue = false) => {
    return new RealmTaggedMember("bool", defaultValue) as any as boolean;
  },

  mixed: <T = unknown>(defaultValue = undefined) => {
    return new RealmTaggedMember("mixed", defaultValue) as any as T;
  },

  dictionary: <T>(valueType: T, defaultValue = new Map<string, T>()) => {
    // Probably this should be a Realm.Dictionary not a Map!
    return new RealmTaggedMember(
      `${getType(valueType)}{}`,
      defaultValue
    ) as any as Map<string, T>;
  },

  set: <T>(type: T, defaultValue = new Set<T>()) => {
    return new RealmTaggedMember(
      `${getType(type)}<>`,
      defaultValue
    ) as any as Set<T>;
  },
};

function makeRealmObject(_this: any) {
  _this["schema"] = { name: _this.constructor.name, properties: {} };

  for (const key of Object.getOwnPropertyNames(_this)) {
    if (!(_this[key] instanceof RealmTaggedMember)) {
      continue;
    }

    _this["schema"]["properties"][key] = _this[key].schemaType;
    _this[key] = _this[key].originalValue;
  }
}

class Thing extends RealmObject {
  listOfThings = RealmTypes.array(Thing);
  listOfInts = RealmTypes.array(RealmTypes.int(), [1, 2, 3]);
  int = RealmTypes.int(3);
  float = RealmTypes.float();
  double = RealmTypes.double();
  string = RealmTypes.string();
  mixed = RealmTypes.mixed();
  dictionaryOfThings = RealmTypes.dictionary(Thing);
  dictionaryOfMixed = RealmTypes.dictionary(RealmTypes.mixed);
  // setOfThings = RealmTypes.set(Thing);
  // setOfStrings = RealmTypes.set(RealmTypes.string);

  nonRealm = 0;

  constructor() {
    super();
    makeRealmObject(this);
    console.log("this", this);
  }

  getZDouble = () => {
    return this.int * 2;
  };
}

const realm = new Realm({ schema: [new Thing().schema] });

for (let obj of realm.objects<Thing>("Thing")) {
  console.log(obj.toJSON());
  console.log(obj.string);
  console.log(obj.listOfThings.length);
}

realm.write(() => {
  realm.deleteAll();

  const x = new Thing();
  x.string = "I am x";
  realm.create("Thing", x);

  const y = new Thing();
  y.string = "I am y";
  y.int = 99;
  realm.create("Thing", y);
  // x.listOfThings.push(y);

  console.log({ x, y });
});
// const y = new Thing();
// x.listOfThings.push(y);
// console.log(x);
// console.log(x.getZDouble());
