import Realm from "realm";
import { makeRealmClass, RealmTypes } from "./realm";

/**
 * Example class with a variety of types
 */
class MyClass extends makeRealmClass("MyClass", {
  listOfInts: RealmTypes.list(() => RealmTypes.int(), [1, 2, 3]),
  listOfMyClass: RealmTypes.optional().list(() => MyClass),
  // listOfOtherClass: RealmTypes.optional().list(() => OtherClass),
  int: RealmTypes.int(3),
  float: RealmTypes.float(),
  double: RealmTypes.double(),
  string: RealmTypes.string(),
  mixed: RealmTypes.mixed<number | string>(),
  // dictionaryOfMyClass: RealmTypes.optional().dictionary(() => MyClass),
  // dictionaryOfMixed: RealmTypes.optional().dictionary(() => RealmTypes.mixed()),
  // setOfMyClass: RealmTypes.optional().set(() => MyClass),
  // setOfStrings: RealmTypes.optional().set(() => RealmTypes.string()),
}) {
  getDoubleInt = () => {
    return this.int * 2;
  };
}

class OtherClass extends makeRealmClass("OtherClass", {
  name: RealmTypes.string(),
}) {}

const myInstance = new MyClass();

// These all have the expected types
myInstance.listOfInts;
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
  const myInstance = realm.create(MyClass, {
    listOfInts: [1, 2, 3],
    int: 1,
    float: 1,
    double: 1,
    string: "1",
    mixed: "1",
  });
  const otherInstance = realm.create(OtherClass, {});
});
