import assert from "node:assert/strict";
import { test } from "node:test";
import { createElement as h, Fragment } from "react";
import { selectOptions } from "../src/components/ui/select-options";

test("custom pickers preserve numeric values, fragments, and option groups", () => {
 const options = selectOptions(h(Fragment, null,
  h("option", {value:""}, "Choose"),
  h("optgroup", {label:"Roles"}, h("option", {value:3}, "Role ", 3), h("option", {disabled:true,value:"closed"}, "Closed")),
 ));
 assert.deepEqual(options.map(({value,label,group,disabled})=>({value,label,group,disabled:Boolean(disabled)})), [
  {value:"",label:"Choose",group:undefined,disabled:false},
  {value:"3",label:"Role 3",group:"Roles",disabled:false},
  {value:"closed",label:"Closed",group:"Roles",disabled:true},
 ]);
});
test("disabled groups, hidden placeholders and implicit values survive conversion", () => {
 const options = selectOptions(h(Fragment, null,
  h("option", {hidden:true,value:""}, "Select"),
  h("optgroup", {disabled:true,label:"Unavailable"}, h("option", null, "Implicit")),
 ));
 assert.equal(options[0].hidden,true);
 assert.equal(options[1].value,"Implicit");
 assert.equal(options[1].disabled,true);
});
