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

    var days = d3.timeDays(new Date(2016, 0, 11), new Date(2016, 11, 10));
    for (var i = 0; i < days.length; i++) {
      var weekday = days[i].getDay();
      if (weekday<2 || weekday>6) // only week days
        continue;
      if (Math.random() < 0.24) // some days off
        continue;
      const date = days[i].toISOString().substring(0, 10) + "T08:00:00";
      var node =
        {
          name: "firefox",
          days: [],
          children: [
            {
              name: "google.com",
              days: [
                {
                  datetime: date,
                  activeseconds: 3600,
                  semiidleseconds: 3600
                }
              ],
              children: []
            }
          ]
        };
      children.push(node);
    }



    return data;
  };

  return {
    generate_pt: generate_pt
  }

})();