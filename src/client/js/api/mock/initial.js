// prettier-ignore
// generated w/ https://www.mockaroo.com/schemas/clone?clone=1712955039237
/*
    NEEDS: avatar url, password hash
*/
export const MOCK_USERS = [
    {"_id":"1","name":"Desdemona Fenning","email":"dfenning0@seattletimes.com","username":"dfenning0","skills":["Sass"],"skillsWanted":["Express","Jest","Babel"]},
    {"_id":"2","name":"Dunn Draye","email":"ddraye1@newyorker.com","username":"ddraye1","skills":["Angular","Babel","PostgreSQL","Sass","Express"],"skillsWanted":["GraphQL","Vue","REST API"]},
    {"_id":"3","name":"Chrisy Alu","email":"calu2@auda.org.au","username":"calu2","skills":["Mocha","React","GraphQL"],"skillsWanted":["Socket.io","Express","Webpack","Vue","Redux"]},
    {"_id":"4","name":"Marmaduke Grunnill","email":"mgrunnill3@timesonline.co.uk","username":"mgrunnill3","skills":["Docker"],"skillsWanted":["Sass"]},
    {"_id":"5","name":"Rice Darey","email":"rdarey4@list-manage.com","username":"rdarey4","skills":["Material-UI","Bootstrap","MySQL","PostgreSQL"],"skillsWanted":["Express"]},
    {"_id":"6","name":"Quintus Garmon","email":"qgarmon5@taobao.com","username":"qgarmon5","skills":["REST API","Chai","Angular"],"skillsWanted":["MongoDB","GraphQL","Docker","Material-UI"]},
    {"_id":"7","name":"Filmore Shepland","email":"fshepland6@booking.com","username":"fshepland6","skills":["Socket.io","Bootstrap","Mocha","Vue","Angular"],"skillsWanted":[]},
    {"_id":"8","name":"Stephana Rilton","email":"srilton7@com.com","username":"srilton7","skills":["Angular","Vue","GraphQL"],"skillsWanted":["Jest","Socket.io","Chai"]},
    {"_id":"9","name":"Hunter Adamowicz","email":"hadamowicz8@google.es","username":"hadamowicz8","skills":["GraphQL"],"skillsWanted":["Webpack","Vue","Angular"]},
    {"_id":"10","name":"Tan Delhanty","email":"tdelhanty9@barnesandnoble.com","username":"tdelhanty9","skills":["Mocha","Material-UI","Sass","Redux","Socket.io"],"skillsWanted":["GraphQL","Docker"]}
];

// prettier-ignore
// generated w/ https://www.mockaroo.com/schemas/clone?clone=1712712455616
/*
    - backend would contain `createdAt` and `updatedAt` times as well
    - perhaps an `isCancelled` to keep the record but show as not happening/happened
*/
export const MOCK_APPOINTMENTS = [
    {"_id":"1","teacherId":"10","learnerId":"8","time":1711353772000,"type":"in-person","url":"","topic":"arcu libero rutrum"},
    {"_id":"2","teacherId":"10","learnerId":"1","time":1715553749000,"type":"online","url":"https://zoom.us/meeting/1234567890","topic":"luctus cum sociis natoque penatibus"},
    {"_id":"3","teacherId":"6","learnerId":"5","time":1699467603000,"type":"in-person","url":"","topic":"in tempus"},
    {"_id":"4","teacherId":"6","learnerId":"7","time":1683535706000,"type":"in-person","url":"","topic":"mauris non ligula pellentesque ultrices"},
    {"_id":"5","teacherId":"1","learnerId":"9","time":1714834976000,"type":"online","url":"https://zoom.us/meeting/0987654321","topic":"eget"},
    {"_id":"6","teacherId":"7","learnerId":"8","time":1692133092000,"type":"online","url":"https://zoom.us/meeting/5678901234","topic":"eleifend quam a"},
    {"_id":"7","teacherId":"7","learnerId":"3","time":1680993311000,"type":"in-person","url":"","topic":"quam a odio in hac"},
    {"_id":"8","teacherId":"1","learnerId":"4","time":1713364415000,"type":"online","url":"https://zoom.us/meeting/4321098765","topic":"ultricies"},
    {"_id":"9","teacherId":"9","learnerId":"7","time":1682787386000,"type":"online","url":"https://zoom.us/meeting/9876543210","topic":"lectus"},
    {"_id":"10","teacherId":"8","learnerId":"2","time":1711601887000,"type":"in-person","url":"","topic":"aliquam non mauris morbi"},
    {"_id":"11","teacherId":"1","learnerId":"10","time":1716275351000,"type":"online","url":"https://zoom.us/meeting/2468135790","topic":"sem duis aliquam"},
    {"_id":"12","teacherId":"3","learnerId":"6","time":1693490489000,"type":"online","url":"https://zoom.us/meeting/1357924680","topic":"lacinia sapien quis libero"},
    {"_id":"13","teacherId":"1","learnerId":"10","time":1701964738000,"type":"in-person","url":"","topic":"lacus"},
    {"_id":"14","teacherId":"8","learnerId":"9","time":1689931005000,"type":"online","url":"https://zoom.us/meeting/9876543210","topic":"integer aliquet massa"},
    {"_id":"15","teacherId":"7","learnerId":"8","time":1716874447000,"type":"online","url":"https://zoom.us/meeting/5678901234","topic":"cum sociis natoque penatibus et"},
    {"_id":"16","teacherId":"8","learnerId":"5","time":1697835055000,"type":"in-person","url":"","topic":"ultrices aliquet maecenas leo odio"},
    {"_id":"17","teacherId":"4","learnerId":"5","time":1698792747000,"type":"in-person","url":"","topic":"integer ac"},
    {"_id":"18","teacherId":"10","learnerId":"3","time":1704512942000,"type":"in-person","url":"","topic":"turpis enim blandit mi in"},
    {"_id":"19","teacherId":"8","learnerId":"9","time":1687879620000,"type":"in-person","url":"","topic":"et eros vestibulum ac"},
    {"_id":"20","teacherId":"3","learnerId":"5","time":1693799872000,"type":"in-person","url":"","topic":"bibendum morbi non quam"},
].map(v => {
    v.createdAt = Date.now();
    v.updatedAt = Date.now()
    v.isCancelled = false;
    return v;
});
