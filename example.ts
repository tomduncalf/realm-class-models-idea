import Realm from "realm";
import { makeRealmClass, RealmTypes } from "./realm";

/**
 * Example class with a variety of types
 */
class MyClass extends makeRealmClass("MyClass", {
  listOfMyClass: RealmTypes.list(() => MyClass),
  listOfOtherClass: RealmTypes.list(() => OtherClass),
  listOfInts: RealmTypes.list(() => RealmTypes.int(), [1, 2, 3]),
  int: RealmTypes.int(3),
  float: RealmTypes.float(),
  double: RealmTypes.double(),
  string: RealmTypes.string(),
  optionalString: RealmTypes.optional().string(),
  mixed: RealmTypes.mixed(),
  dictionaryOfMyClass: RealmTypes.dictionary(() => MyClass),
  dictionaryOfMixed: RealmTypes.dictionary(() => RealmTypes.mixed()),
  setOfMyClass: RealmTypes.set(() => MyClass),
  setOfStrings: RealmTypes.set(() => RealmTypes.string()),
}) {
  // A member which is not persisted in Realm
  nonRealmProperty = 0;

  // An instance method
  getDoubleInt = () => {
    return this.int * 2;
  };
}

class OtherClass extends makeRealmClass("OtherClass", {
  name: RealmTypes.string(),
}) {}

const myInstance = new MyClass();

// These all have the expected types
myInstance.listOfMyClass;
myInstance.dictionaryOfMyClass;
myInstance.setOfMyClass;

console.log(MyClass.schema);

/**
 * Outputs this Realm schema:
 *
 * {
 *   properties: {
 *     listOfMyClass: 'MyClass[]',
 *     listOfOtherClass: 'OtherClass[]',
 *     listOfInts: 'int[]',
 *     int: 'int',
 *     float: 'float',
 *     double: 'double',
 *     string: 'string',
 *     optionalString: 'string?',
 *     mixed: 'mixed',
 *     dictionaryOfMixed: 'mixed{}',
 *     setOfStrings: 'string<>'
 *   },
 *   name: 'MyClass'
 * }
 */

console.log(myInstance);

/**
 * Outputs this, note that all the class members are now the underlying JS types:
 *
 * MyClass {
 *   listOfMyClass: [],
 *   listOfOtherClass: [],
 *   listOfInts: [ 1, 2, 3 ],
 *   int: 3,
 *   float: 0,
 *   double: 0,
 *   string: '',
 *   optionalString: '',
 *   mixed: undefined,
 *   dictionaryOfMixed: Map(0) {},
 *   setOfStrings: Set(0) {},
 *   nonRealmProperty: 0,
 *   getDoubleInt: [Function (anonymous)]
 * }
 */

const realm = new Realm({ schema: [MyClass, OtherClass] });
realm.write(() => {
  // TODO weird type issue
  const myInstance = realm.create(MyClass as any, {});
  const otherInstance = realm.create(OtherClass as any, {});
});
