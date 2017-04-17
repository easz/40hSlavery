#!/usr/bin/python

#
# This script collects all perforce commit history of a user.
#
# * Two output files will be generated
#   * a CSV file containing all changelist committed by the user 
#     with date, time, count(file_add), count(file_delete), count(file_edit), count(line_add), count(line_delete), count(line_edit)
#   * a dump of a hashmap containing all committed file paths with all affected revision numbers
# * This script uses p4 changes, p4 describe, p4 print and etc and can have bad performance on huge commit history.
# * To reduce running time and resource (i.e. by tuning options)
#   * limit the task to a short time span (e.g. within few monthes instead over years)
#   * Not to count lines of added or deleted files
#

import sys
import re
import json
from subprocess import Popen, PIPE
from optparse import OptionParser

#
# command arguments / options
# Example:
# 		%prog -u max.mustermann -f @2017/01/01 -t @2017/01/31 -o output
#
parser = OptionParser(usage="usage: %prog [options]")
parser.add_option("-u", dest="user_name",                            help="perforce user name")
parser.add_option("-f", dest="date_from",     default="@2012/01/01", help="begin date of changelists [default: %default]")
parser.add_option("-t", dest="date_to",       default="@now",        help="end date of changelists [default: %default]")
parser.add_option("-o", dest="out_prefix",    default="p4metrics",   help="prefix of output files [default: %default]")
parser.add_option("--nc", dest="not_count_add_del", action="store_true", default=False, help="Not to count lines of added and deleted files (To reduce running time) [default: %default]")
parser.add_option("-q", "--quiet", dest="stdout_quiet", action="store_true", default=False, help="Not to show progress on stdout [default: %default]")
(options, args) = parser.parse_args()

if not options.user_name:
	parser.print_help()
	sys.exit()

#
# variables
#
OPTIONS = vars(options)
USER_NAME = OPTIONS["user_name"]
DATE_FROM = OPTIONS["date_from"]
DATE_TO   = OPTIONS["date_to"]
NOT_COUNT_ADD_DEL = OPTIONS["not_count_add_del"]
STDOUT_QUIET = OPTIONS["stdout_quiet"]
OUT_PREFIX = OPTIONS["out_prefix"] 

commit_files = {}                                # { "file path" : [ revision ] }

out_csv = open("%s.csv"%OUT_PREFIX, 'w')         # CSV "change,date,time,file_add,file_del,file_change,line_add,line_del,line_change"
out_json = open("%s.files.json"%OUT_PREFIX, 'w') # data dump of commit_files


#
# regex 
#
# Example: Change 470596 on 2012/06/18 11:29:38 by max.mustermann@c-max.mustermann-dev 'REFACTORED: refactoring example'
regex_p4change = re.compile("Change\s+(\d+)\s+on\s+(\d+/\d+/\d+)\s+(\d+:\d+:\d+)") # (changelist) (date) (time)
# Example: ... //sw/src/plugin/Configuration.xml#7 edit
regex_p4describe_file_op =  re.compile("^\.\.\.\s+(.+)#(\d+)\s+(\w+)\s*$")         # (file) (rev) (op)
# Example: add 1 chunks 2 lines
regex_p4describe_line_op = re.compile("^(\w+).+(\d+)\s+lines\s*$")                 # (line op) (lines)          


# OUTPUT: CSV meta
out_csv.write("change,date,time,file_add,file_del,file_change,line_add,line_del,line_change")


# $ p4 changes -t -u max.mustermann @2012/01/01,@now
proc_p4changes = Popen(["p4", "changes", "-t", "-u", USER_NAME, "%s,%s"%(DATE_FROM,DATE_TO)], stdout=PIPE, stderr=PIPE)
stdout_p4changes = proc_p4changes.communicate()[0]

# Extract "p4 changes"
for p4change in stdout_p4changes.split('\n'):
	# Match (changelist) (date) (time)	
	regex_p4change_search = regex_p4change.search(p4change)	

	if regex_p4change_search:    

		CHANGELIST_NR = regex_p4change_search.group(1)
		CHANGELIST_DATE = regex_p4change_search.group(2)
		CHANGELIST_TIME = regex_p4change_search.group(3)

		# counters
		changelist_file_op_count = { "add":0, "delete":0, "edit":0 }
		changelist_line_op_count = { "add":0, "deleted":0, "changed":0 }

		# $ p4 describe -dsbw CHANGELIST_NR
		proc_p4describe = Popen(["p4", "describe", "-dsbw", CHANGELIST_NR], stdout=PIPE, stderr=PIPE)
		stdout_p4describe = proc_p4describe.communicate()[0]
    		
		# Extract "p4 describe"
		for p4describe in stdout_p4describe.split('\n'):
			# Match (file#rev) (op)
			regex_p4describe_file_op_search = regex_p4describe_file_op.search(p4describe)
			# Match (line op) (lines)          
			regex_p4describe_line_op_search = regex_p4describe_line_op.search(p4describe)

			# Extract "Affected files ..."
			if regex_p4describe_file_op_search:				
				# file edit, add, delete
				FILE_PATH = regex_p4describe_file_op_search.group(1) 
				FILE_REV  = int(regex_p4describe_file_op_search.group(2)) 
				FILE_OP   = regex_p4describe_file_op_search.group(3)
				
				# collect commited files revisions		
				if not FILE_PATH in	commit_files:
					commit_files[FILE_PATH] = []
				commit_files[FILE_PATH].append(FILE_REV)

				# count file ops
				if not FILE_OP in changelist_file_op_count:
					changelist_file_op_count[FILE_OP] = 0
				changelist_file_op_count[FILE_OP] += 1
				
				# count lines of ADD / DELETE file
				if not NOT_COUNT_ADD_DEL:	
					# count lines of "add" files			
					if FILE_OP == "add":		
						proc_p4print = Popen(["p4", "print", "%s#%s"%(FILE_PATH,str(FILE_REV))], stdout=PIPE, stderr=PIPE)
						stdout_p4print = proc_p4print.communicate()[0]
						LINE_COUNT = len(stdout_p4print.split('\n')) - 1
						if not "add" in changelist_line_op_count:
							changelist_line_op_count["add"] = 0
						changelist_line_op_count["add"] += LINE_COUNT
					# count lines of "delete" files
					if FILE_OP == "delete":
						proc_p4print = Popen(["p4", "print", "%s#%s"%(FILE_PATH,str(FILE_REV-1))], stdout=PIPE, stderr=PIPE)
						stdout_p4print = proc_p4print.communicate()[0]
						LINE_COUNT = len(stdout_p4print.split('\n')) - 1
						if not "deleted" in changelist_line_op_count:
							changelist_line_op_count["deleted"] = 0
						changelist_line_op_count["deleted"] += LINE_COUNT

			#	Extract "Differences ..."
			if regex_p4describe_line_op_search:
				LINE_OP    = regex_p4describe_line_op_search.group(1)
				LINE_COUNT = int(regex_p4describe_line_op_search.group(2))
				# count lines of "edit" files
				if not LINE_OP in changelist_line_op_count:
					changelist_line_op_count[LINE_OP] = 0
				changelist_line_op_count[LINE_OP] += LINE_COUNT
		
		# OUTPUT: 
		# CSV data: "change, date, time, file_add, file_del, file_change, line_add, line_del, line_change"
		out_csv.write("\n")
		out_csv.write("%s,%s,%s,%s,%s,%s,%s,%s,%s" % (
			CHANGELIST_NR, 
			CHANGELIST_DATE, 
			CHANGELIST_TIME, 
			changelist_file_op_count["add"], 
			changelist_file_op_count["delete"], 
			changelist_file_op_count["edit"], 
			changelist_line_op_count["add"], 
			changelist_line_op_count["deleted"], 
			changelist_line_op_count["changed"]))
		
		# progress shown on stdout
		if not STDOUT_QUIET:
			print CHANGELIST_NR

# OUTPUT: dump commit files into file
out_json.write(json.dumps(commit_files))

# close files
out_csv.close()
out_json.close()