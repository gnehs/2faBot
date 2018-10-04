FROM mhart/alpine-node:10.11.0

WORKDIR /app
# 安裝必要組件
#RUN apk add --no-cache make gcc g++ python git
# 複製程式碼
COPY . /app 
# node_modules
RUN npm install --production
# 環境設定
ENV NODE_ENV=production
# 時區
RUN apk add --no-cache tzdata
ENV TZ=Asia/Taipei
# 啟動

CMD ["npm", "start"]