# syndika
node - v12

## Local development
run `nvm use`
1. run `composer install && composer update`
`npm install` in the project root
2. `cp .env.example .env` and add all the necesary vars
3. run `gulp` or `npm run start` for css/js compile
4. run `gulp watch` or `npm run dev` for css/js compile on save

Make changes to `.env` to fit your needs.

Modify your homestead machine to use `./web` as document root.

You will also see any lint errors in the console.

## General documentation

All the files are automatically built in '/web/app/themes/syndika/_'

ACF flexible sections: web/app/themes/syndika/partials/modules
Implementation logic: web/app/themes/syndika/functions/modules.php

Scss folder: web/app/themes/syndika/styles/main/main.scss

JS are all separate files web/app/themes/syndika/scripts/main/main.js but after build we create a single one
For example here is the build folder: web/app/themes/syndika/_/main.js