const rolePermissions = {
  guru: { kedisiplinan_bpbk: "nonaktif" },
  bpbk: { kedisiplinan_bpbk: "full" }
};

const currentUser = { role: "guru", subrole: "bpbk" };
const activeRole = "guru";
const id = "kedisiplinan_bpbk";

const checkAllowed = roleKey => {
  const perms = rolePermissions?.[roleKey];
  if (!perms) return null;
  if (Array.isArray(perms)) {
    return perms.includes(id) ? "view" : "nonaktif";
  }
  return perms[id];
};

let level = undefined;
if (activeRole === "guru") {
  const subrole = (currentUser?.subrole || "").toLowerCase().trim();
  const SUBROLE_KEYS_GURU = ['bpbk'];
  if (subrole && SUBROLE_KEYS_GURU.includes(subrole)) {
    const subroleLevel = checkAllowed(subrole);
    console.log("subroleLevel:", subroleLevel);
    level = subroleLevel ?? checkAllowed("guru");
  } else {
    level = checkAllowed("guru");
  }
}
console.log("level:", level);
