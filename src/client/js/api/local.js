if (typeof PouchDB === "undefined") {
  console.error("PouchDB not found");
}

export const store = new PouchDB("local");

// keep all data in one row
export const LOCAL_ID = "data";

export const init = (data) =>
  store.put({
    ...data,
    _id: LOCAL_ID,
  });

export const all = async () => {
  try {
    return await store.get(LOCAL_ID);
  } catch (err) {
    return null;
  }
};

export const get = async (key) => {
  const data = await all();
  return data?.[key];
};

export const set = async (key, value) => {
  let data = await all();

  if (!data) {
    await init();
    data = await all();
  }

  if (value) data[key] = value;
  else delete data[key];

  return store.put(data);
};
