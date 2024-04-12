import * as mock from "./mock/index.js";

const MOCK_MS = 200;
const mockFunc =
  (cb) =>
  (...args) =>
    new Promise(async (resolve) => {
      const output = await cb(...args); // do not timeout actual execution to find errors faster
      setTimeout(() => resolve(output), MOCK_MS);
    });

const filterWithValue = (arr, args, value) =>
  arr.filter((item) => args.some((arg) => item[arg] === value));

// ===== SESSION =====

// session depends a bit on implementation
// TODO
const getSession = mockFunc((token) =>
  token
    ? {
        user: MOCK_USERS[1],
      }
    : {},
);

export const session = { get: getSession };

// ===== APPOINTMENTS =====

const withPagination = (pageSize) => async (page, cb) => {
  page = Math.max(1, page);

  const start = (page - 1) * pageSize;
  const res = await cb({ limit: pageSize, skip: start });

  if (res.warning) console.warn(`[PouchDB] ${res.warning}`);

  const data = res.rows || res.docs;
  const totalPages = Math.ceil(res.total_rows / pageSize);

  data.pagination = {};

  if (page > 1) data.pagination.prev = page - 1;
  if (page < totalPages) data.pagination.next = page + 1;

  return data;
};

const APPOINTMENTS_PAGE_SIZE = 8;
const appointmentsPagination = withPagination(APPOINTMENTS_PAGE_SIZE);

const sortByDate = (a, b) => b.time - a.time;

const allAppointments = (page = 1) =>
  appointmentsPagination(
    page,
    async (opts) =>
      await mock.appointments.allDocs({
        include_docs: true,
        ...opts,
      }),
  );

const getAppointment = (id) => mock.appointments.get(id);

const withUserAppointments = async (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { $or: [{ teacherId: userId }, { learnerId: userId }] },
      ...opts,
    }),
  );

const withTeacherAppointments = async (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { teacherId: userId },
      ...opts,
    }),
  );

const withLearnerAppointments = async (userId, page = 1) =>
  appointmentsPagination(page, (opts) =>
    mock.appointments.find({
      selector: { learnerId: userId },
      ...opts,
    }),
  );

// modify
// -> default attrs probably? but those would happen in backend anyways (validation & stuff)
const createAppointment = (data) =>
  mock.appointments.post({
    ...data,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

const updateAppointment = async (id, data) => {
  const doc = await mock.appointments.get(id);

  // keep unchanged data in doc
  // replace changed data
  // prevent replacing id & rev
  return await mock.appointments.put({
    ...doc,
    ...data,
    _id: id,
    _rev: doc._rev,
    updatedAt: Date.now(),
  });
};

export const appointments = {
  // fetch
  all: allAppointments,
  get: getAppointment,
  withUser: withUserAppointments,
  withTeacher: withTeacherAppointments,
  withLearner: withLearnerAppointments,

  // modify
  create: createAppointment,
  update: updateAppointment,
};
