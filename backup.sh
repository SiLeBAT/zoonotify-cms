yarn run strapi export --no-encrypt -f ../backup/cms-$(date -d "today" +"%Y%m%d%H%M")

cd ../backup/

rm `ls -td *.tar.gz | awk 'NR>5'`