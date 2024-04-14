if (typeof PouchDB === "undefined") {
  console.error("PouchDB not found");
}

export const session = new PouchDB("session");
