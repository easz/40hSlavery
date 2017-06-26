var DEMO_DATA = (function () {

  var generate_pt = function () {

    var app_path = {
      firefox: ["google.com", "news.com", "fb.com", "tech.io", "amazon.cc", "cpp.io"],
      outlook: ["/"],
      devenv: ["proj 1", "proj 2", "proj 3", "proj 4"],
      lync: ["alice", "bob", "carl", "tom"],
      visio: ["proj 1", "proj 2", "proj 3", "proj 4"],
      git: ["repo a", "repo b", "repo c"]
    };

    var data = {};
    // TODO: meta ...
    var root = data['root'] = {};
    root['name'] = "(root)";
    root['days'] = [];
    var children = root['children'] = [];

    var days = d3.timeDays(new Date(2016, 0, 11, 8, 0, 0), new Date(2016, 11, 10, 8, 0, 0));
    for (var day_i = 0; day_i < days.length; day_i++) {
      var weekday = days[day_i].getDay();
      if (weekday < 2 || weekday > 6) // only week days
        continue;
      if (Math.random() < 0.3) // some days off
        continue;
      const date = days[day_i].toISOString().substring(0, 10) + "T08:00:00";
      for (const app in app_path) {
        const app_num = Object.keys(app_path).length;
        if (Math.random() < 0.2) 
          continue;
        const app_time = (7*3600 / app_num) * (0.8 + 0.4*Math.random());
        for (var path_i = 0; path_i < app_path[app].length; path_i++) {
          const path = app_path[app][path_i];
          const path_time = (app_time / app_path[app].length) * (0.8 + 0.4*Math.random());
          if (Math.random() < 0.1)
            continue;
          var node =
            {
              name: app,
              days: [],
              children: [
                {
                  name: path,
                  days: [
                    {
                      datetime: date,
                      activeseconds: path_time,
                      semiidleseconds: path_time * 0.1 * (0.8 + 0.4*Math.random())
                    }
                  ],
                  children: []
                }
              ]
            };
          children.push(node);

        }
      }
    }

    return data;
  };

  return {
    generate_pt: generate_pt
  }

})();