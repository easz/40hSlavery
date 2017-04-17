### 40hSlavery

#### Tools

 - perforce_commit_metrics.py 
   - $ perforce_commit_metrics.py -u max.mustermann -f @2017/01/01 -t @2017/01/31 -o output
   - generate 
     - output.csv: all change lists with file (add, delete, edit) and line (add, delete, change) information
     - output.files.json: all committed files with affected revision numbers