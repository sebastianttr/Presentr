FROM node:14.17.5
COPY /backend /backend
COPY /frontend /websites/webrtc
EXPOSE 80 8080
ENTRYPOINT ["node","backend/index.js"]