server {
    listen 80;
    server_name live-web.fangyuanxiaozhan.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name live-web.fangyuanxiaozhan.com;

    ssl_certificate /etc/nginx/ssl/live-web.fangyuanxiaozhan.com/fullchain.cer;
    ssl_certificate_key /etc/nginx/ssl/live-web.fangyuanxiaozhan.com/live-web.fangyuanxiaozhan.com.key;
    ssl_session_timeout 5m;
    ssl_ciphers ECDHE-RSA-AES128-GCM-SHA256:ECDHE:ECDH:AES:HIGH:!NULL:!aNULL:!MD5:!ADH:!RC4;
    ssl_protocols TLSv1 TLSv1.1 TLSv1.2;
    ssl_prefer_server_ciphers on;

    location /live-web/ {
        proxy_pass http://127.0.0.1:38082;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /live/ {
        proxy_pass http://127.0.0.1:38081;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
