# OutBox Mail — SPA estática servida por nginx (pronto para EasyPanel)
FROM nginx:alpine

COPY . /usr/share/nginx/html

# Serve a SPA na raiz e também sob /emails, cobrindo os dois modos de
# roteamento do EasyPanel/Traefik (com ou sem remoção do prefixo /emails).
RUN printf 'server {\n\
  listen 80;\n\
  server_name _;\n\
  root /usr/share/nginx/html;\n\
  index index.html;\n\
\n\
  # entrada dos clientes: mail.outboxgroup.com.br/emails\n\
  location = /emails { try_files /index.html =404; }\n\
  location = /emails/ { return 301 /emails; }\n\
  location /emails/ {\n\
    rewrite ^/emails/(.*)$ /$1 break;\n\
    try_files $uri $uri/ /index.html;\n\
  }\n\
\n\
  # raiz (site institucional) e fallback da SPA por hash\n\
  location / { try_files $uri $uri/ /index.html; }\n\
\n\
  location ~* \\.html$ { add_header Cache-Control "no-cache"; }\n\
  location ~* \\.(css|js)$ { add_header Cache-Control "no-cache"; }\n\
  location ~* \\.(svg|jpg|jpeg|png|webp|gif|ico|woff2?)$ { expires 30d; add_header Cache-Control "public, max-age=2592000"; }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
