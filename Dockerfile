# Imagem base: servidor web Nginx na versão alpine (super leve)
FROM nginx:alpine

# Copia os arquivos da aplicação para a pasta padrão que o Nginx serve
COPY index.html style.css script.js /usr/share/nginx/html/

# Expõe a porta 80 padrão de servidores HTTP
EXPOSE 80


