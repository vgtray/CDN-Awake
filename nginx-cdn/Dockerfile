FROM nginx:alpine

COPY nginx.conf /etc/nginx/nginx.conf.template
COPY index.html /usr/share/nginx/html/
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

ENTRYPOINT ["/entrypoint.sh"]
