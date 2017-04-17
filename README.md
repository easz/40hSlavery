### How a 40 Hours Week was Spent and Rewarded for the Modern Slavery

#### Tools

 - **perforce_commit_metrics.py**
   - collect all perforce commits made by a user within a time span
     - $ perforce_commit_metrics.py -u max.mustermann -f @2017/01/01 -t @2017/12/31 -o output
   - generate output
     - *output*.csv: all perforce changelists with information about affected files (add, delete, edit) and lines (add, delete, change)
     - *output*.files.json: all committed file paths with affected revision numbers
  - **p4metrics.files.anonymize.py**
     - anonymize the *output*.files.json generated by perforce_commit_metrics.py

#### Charts

  - adapt **config.json** with the desired date set
    - **commit_info_csv** and **commit_files_json** point to the files generated by the tool perforce_commit_metrics.py
  - open **index.html** with browser 
    - Firefox works and is tested.
    - Chrome brwoser may not work because of security policy.
    - Or run a local HTTP server: https://github.com/d3/d3/wiki#local-development