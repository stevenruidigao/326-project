const MOCK_MS = 200;
const mock =
  (cb) =>
  (...args) =>
    new Promise(async (resolve) => {
      const output = await cb(...args); // do not timeout actual execution to find errors faster
      setTimeout(() => resolve(output), MOCK_MS);
    });

const filterWithValue = (arr, args, value) =>
  arr.filter((item) => args.some((arg) => item[arg] === value));

// prettier-ignore
// generated using https://www.mockaroo.com/
/*
    NEEDS: avatar url, password hash, skills user has, skill user wants
*/
const MOCK_USERS = [
    {"id":1,"name":"Test User","email":"test@example.com","username":"username"},
    {"id":2,"name":"Toddy Dawson","email":"tdawson1@europa.eu","username":"tdawson1"},
    {"id":3,"name":"Meryl Hansen","email":"mhansen2@a8.net","username":"mhansen2"},
    {"id":4,"name":"Ilaire Eouzan","email":"ieouzan3@tiny.cc","username":"ieouzan3"},
    {"id":5,"name":"Tedi Rudeyeard","email":"trudeyeard4@feedburner.com","username":"trudeyeard4"},
    {"id":6,"name":"Coralyn Bugdall","email":"cbugdall5@ustream.tv","username":"cbugdall5"},
    {"id":7,"name":"Kane Carlyle","email":"kcarlyle6@bandcamp.com","username":"kcarlyle6"},
    {"id":8,"name":"Winne Fewster","email":"wfewster7@prnewswire.com","username":"wfewster7"},
    {"id":9,"name":"Eveleen Dryden","email":"edryden8@miibeian.gov.cn","username":"edryden8"},
    {"id":10,"name":"Brooke Adran","email":"badran0@ask.com","username":"badran0"},
];

// ===== SESSION =====

// session depends a bit on implementation
const getSession = mock((token) =>
  token
    ? {
        user: MOCK_USERS[1],
      }
    : {},
);

export const session = { get: getSession };

// ===== APPOINTMENTS =====

// generated w/ https://www.mockaroo.com/schemas/clone?clone=1712712455616
// prettier-ignore
/*
    - backend would contain `createdAt` and `updatedAt` times as well
    - perhaps an `isCancelled` to keep the record but show as not happening/happened
*/
const MOCK_APPOINTMENTS = [
    {"id":1,"teacherId":10,"learnerId":8,"time":1711353772000,"type":"in-person","url":"","topic":"arcu libero rutrum"},
    {"id":2,"teacherId":10,"learnerId":1,"time":1715553749000,"type":"online","url":"https://zoom.us/meeting/1234567890","topic":"luctus cum sociis natoque penatibus"},
    {"id":3,"teacherId":6,"learnerId":5,"time":1699467603000,"type":"in-person","url":"","topic":"in tempus"},
    {"id":4,"teacherId":6,"learnerId":7,"time":1683535706000,"type":"in-person","url":"","topic":"mauris non ligula pellentesque ultrices"},
    {"id":5,"teacherId":1,"learnerId":9,"time":1714834976000,"type":"online","url":"https://zoom.us/meeting/0987654321","topic":"eget"},
    {"id":6,"teacherId":7,"learnerId":8,"time":1692133092000,"type":"online","url":"https://zoom.us/meeting/5678901234","topic":"eleifend quam a"},
    {"id":7,"teacherId":7,"learnerId":3,"time":1680993311000,"type":"in-person","url":"","topic":"quam a odio in hac"},
    {"id":8,"teacherId":1,"learnerId":4,"time":1713364415000,"type":"online","url":"https://zoom.us/meeting/4321098765","topic":"ultricies"},
    {"id":9,"teacherId":9,"learnerId":7,"time":1682787386000,"type":"online","url":"https://zoom.us/meeting/9876543210","topic":"lectus"},
    {"id":10,"teacherId":8,"learnerId":2,"time":1711601887000,"type":"in-person","url":"","topic":"aliquam non mauris morbi"},
    {"id":11,"teacherId":1,"learnerId":10,"time":1716275351000,"type":"online","url":"https://zoom.us/meeting/2468135790","topic":"sem duis aliquam"},
    {"id":12,"teacherId":3,"learnerId":6,"time":1693490489000,"type":"online","url":"https://zoom.us/meeting/1357924680","topic":"lacinia sapien quis libero"},
    {"id":13,"teacherId":1,"learnerId":10,"time":1701964738000,"type":"in-person","url":"","topic":"lacus"},
    {"id":14,"teacherId":8,"learnerId":9,"time":1689931005000,"type":"online","url":"https://zoom.us/meeting/9876543210","topic":"integer aliquet massa"},
    {"id":15,"teacherId":7,"learnerId":8,"time":1716874447000,"type":"online","url":"https://zoom.us/meeting/5678901234","topic":"cum sociis natoque penatibus et"},
    {"id":16,"teacherId":8,"learnerId":5,"time":1697835055000,"type":"in-person","url":"","topic":"ultrices aliquet maecenas leo odio"},
    {"id":17,"teacherId":4,"learnerId":5,"time":1698792747000,"type":"in-person","url":"","topic":"integer ac"},
    {"id":18,"teacherId":10,"learnerId":3,"time":1704512942000,"type":"in-person","url":"","topic":"turpis enim blandit mi in"},
    {"id":19,"teacherId":8,"learnerId":9,"time":1687879620000,"type":"in-person","url":"","topic":"et eros vestibulum ac"},
    {"id":20,"teacherId":3,"learnerId":5,"time":1693799872000,"type":"in-person","url":"","topic":"bibendum morbi non quam"},
];

const APPOINTMENTS_PAGE_SIZE = 8;

const sortByDate = (a, b) => b.time - a.time;

// fetch data with pagination sorted by date
const allAppointments = mock((page = 1) => {
  page = Math.max(1, page);

  const start = (page - 1) * APPOINTMENTS_PAGE_SIZE;
  const end = page * APPOINTMENTS_PAGE_SIZE;
  const totalPages = Math.ceil(
    MOCK_APPOINTMENTS.length / APPOINTMENTS_PAGE_SIZE,
  );

  const data = MOCK_APPOINTMENTS.sort(sortByDate).slice(start, end);

  data.pagination = {};

  if (page > 1) data.pagination.prev = page - 1;
  if (page < totalPages) data.pagination.next = page + 1;

  return data;
});

const getAppointment = mock(
  (id) => MOCK_APPOINTMENTS.find((appt) => appt.id === id) || null,
);

const withUserAppointments = mock((userId) =>
  filterWithValue(MOCK_APPOINTMENTS, ["teacherId", "learnerId"], userId).sort(
    sortByDate,
  ),
);
const withTeacherAppointments = mock((userId) =>
  filterWithValue(MOCK_APPOINTMENTS, ["teacherId"], userId).sort(sortByDate),
);
const withLearnerAppointments = mock((userId) =>
  filterWithValue(MOCK_APPOINTMENTS, ["learnerId"], userId).sort(sortByDate),
);

// modify
const createAppointment = mock((data) => {
  const id = MOCK_APPOINTMENTS[MOCK_APPOINTMENTS.length - 1].id + 1;
  const appt = { ...data, id };

  MOCK_APPOINTMENTS.push(appt);

  return appt;
});

const updateAppointment = mock((id, data) => {
  const old = MOCK_APPOINTMENTS.find((appt) => appt.id === id);

  if (!old) throw new Error(`Appointment #${id} not found!`);

  for (const key in data) {
    if (key === "id") continue;

    old[key] = data[key];
  }

  return old;
});

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
