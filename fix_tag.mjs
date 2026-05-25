import fs from "fs";

const path = "app/page.tsx";
let t = fs.readFileSync(path, "utf8");
const D = "di" + "v";
const bad = "          <" + "motion" + "></" + "motion" + ">\n";
const good = "          <" + D + ' className="relative">\n';

if (!t.includes(bad.trim().replace(/\n$/, ""))) {
  // try alternate pattern
  const alt = /<motion><operators/;
}

if (t.includes("<motion></motion>")) {
  t = t.replace("<motion></motion>", `<${D} className="relative">`);
  fs.writeFileSync(path, t);
  console.log("fixed motion tag");
} else {
  console.log("motion tag not found");
  process.exit(1);
}
