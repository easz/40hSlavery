import sys
import json
from optparse import OptionParser


#
# command arguments / options
# Example:
# 		%prog files.json
#
parser = OptionParser(usage="usage: %prog input_file")
(options, args) = parser.parse_args()

if len(args) == 0:
	parser.print_help()
	sys.exit()


IN_JSON = args[0]
OUT_JSON = "%s.annoymous" % args[0]

in_json = open(IN_JSON, 'r') 
DATA = json.load(in_json)
in_json.close()

data_trnaslated = {}

dirs = {}
dir_translate = {}
dir_count = 0

files = {}
files_translate = {}
file_count = 0

for key, value in DATA.items():
  path_items = key.split("/")
  path_items_translated = []

  for item in path_items[1:-1]:
    if item not in dirs:
      dirs[item] = 1
      dir_translate[item] = "d%s"%str(dir_count)
      dir_count += 1
    path_items_translated.append(dir_translate[item])

  file_name = path_items[-1]
  dot_idx = file_name.rfind('.')
  file_count += 1
  if dot_idx is not -1:
    file_prefix = file_name[0: dot_idx]
    file_suffix = file_name[dot_idx+1:]
    files_translate[file_name] = "f%s.%s"%(str(file_count),file_suffix)
  else:
    files_translate[file_name] = "f%s"%(str(file_count))
  path_items_translated.append(files_translate[file_name])

  key_new = "//%s" % ('/'.join(path_items_translated))
  data_trnaslated[key_new] = value

out_json = open(OUT_JSON, 'w')
out_json.write(json.dumps(data_trnaslated, indent=0, sort_keys=True))
out_json.close()