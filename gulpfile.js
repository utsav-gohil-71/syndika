const { join } = require('path')
const { readFileSync } = require('fs')
const { src, dest, parallel, series, task, watch } = require('gulp')
const { createHash } = require('crypto')

const _package = require('./package.json')

const _args = require('yargs').alias('b', 'build').default('build', false).argv

const _ = require('lodash')
const _isValidGlob = require('is-valid-glob')
const _delete = require('delete')
const _sass = require('gulp-sass')(require('sass'))
const _sourcemaps = require('gulp-sourcemaps')
const _postcss = require('gulp-postcss')
const _autoprefixer = require('autoprefixer')
const _concat = require('gulp-concat')
const _if = require('gulp-if')
const _uglify = require('gulp-uglify')
const _rename = require('gulp-rename')

// START SETTINGS
const themePath = `./web/app/themes/${_package.name}`

const _themes = ['parent']
const _buildSets = ['main', 'login', 'admin']
const _paths = {
	styles: {
		parent: join(themePath, 'styles'),
	},
	scripts: {
		parent: join(themePath, 'scripts'),
	},
	plugins: {
		parent: join(themePath, 'functions', 'plugins'),
	},
	build: {
		parent: join(themePath, '_'),
	},

	node_modules: join('.', 'node_modules'),
	vendor_file: {
		parent: join(themePath, 'vendor.json'),
	},
}

const _sassOptions = {
	outputStyle: _args.build ? 'compressed' : 'compressed',
	includePaths: [_paths.node_modules, _paths.styles.parent],
}

const _concatOptions = {
	newLine: ';',
}
const _uglifyOptions = {
	output: {
		comments: /^!|@preserve|@license|@cc_on/i,
	},
}
// END SETTINGS

// START TASKS
task(`clean`, (cb) =>
	_delete(
		_themes.map((theme) => _paths.build[theme]),
		cb,
	),
)

let _hasVendorCopyTasks = false
_themes.forEach((theme) => {
	const vendorJson = JSON.parse(
		readFileSync(_paths.vendor_file[theme], 'utf8'),
	)

	_buildSets.forEach((name) => {
		// styles
		task(`${theme}.styles.${name}`, () => {
			return src(
				join(_paths.styles[theme], name, `${name}.scss`),
				join(_paths.styles[theme], name, `${name}.sass`),
			)
				.pipe(_sourcemaps.init())
				.pipe(_sass(_sassOptions).on('error', _sass.logError))
				.pipe(_postcss([_autoprefixer()]))
				.pipe(_rename(`${name}.css`))
				.pipe(_sourcemaps.write('.'))
				.pipe(dest(_paths.build[theme]))
		})
		task(`clean.${theme}.styles.${name}`, (cb) =>
			_delete(join(_paths.build[theme], `${name}.css`), cb),
		)
		task(`watch.${theme}.styles.${name}`, (cb) => {
			return watch(
				[
					join(_paths.styles[theme], name, `**/*.scss`),
					join(_paths.styles[theme], name, `**/*.sass`),
				],
				parallel(`${theme}.styles.${name}`),
			)
		})

		// scripts
		task(`${theme}.scripts.${name}`, () => {
			return src(join(_paths.scripts[theme], name, `**/*.js`))
				.pipe(_concat(`${name}.js`, _concatOptions))
				.pipe(_if(_args.build, _uglify(_uglifyOptions)))
				.pipe(dest(_paths.build[theme]))
		})
		task(`clean.${theme}.scripts.${name}`, (cb) =>
			_delete(join(_paths.build[theme], `${name}.js`), cb),
		)
		task(`watch.${theme}.scripts.${name}`, (cb) => {
			return watch(
				join(_paths.scripts[theme], name, `**/*.js`),
				parallel(`${theme}.scripts.${name}`),
			)
		})

		// vendor styles
		task(`${theme}.vendor.styles.${name}`, (cb) => {
			const vendorStyles = vendorJson.styles[name]

			if (_isValidGlob(vendorStyles)) {
				return src(vendorStyles)
					.pipe(_concat(`${name}-vendor.css`))
					.pipe(_postcss([_autoprefixer()]))
					.pipe(dest(_paths.build[theme]))
			}

			cb()
		})
		task(`clean.${theme}.vendor.styles.${name}`, (cb) =>
			_delete(join(_paths.build[theme], `${name}-vendor.css`), cb),
		)

		// vendor scripts
		task(`${theme}.vendor.scripts.${name}`, (cb) => {
			const vendorScripts = vendorJson.scripts[name]

			if (_isValidGlob(vendorScripts)) {
				return src(vendorScripts)
					.pipe(_concat(`${name}-vendor.js`, _concatOptions))
					.pipe(_if(_args.build, _uglify(_uglifyOptions)))
					.pipe(dest(_paths.build[theme]))
			}

			cb()
		})
		task(`clean.${theme}.vendor.scripts.${name}`, (cb) =>
			_delete(join(_paths.build[theme], `${name}-vendor.js`), cb),
		)
	})

	task(
		`clean.${theme}.styles`,
		parallel(_buildSets.map((name) => `clean.${theme}.styles.${name}`)),
	)
	task(
		`watch.${theme}.styles`,
		parallel(_buildSets.map((name) => `watch.${theme}.styles.${name}`)),
	)
	task(
		`${theme}.styles`,
		series(
			`clean.${theme}.styles`,
			parallel(_buildSets.map((name) => `${theme}.styles.${name}`)),
		),
	)

	// plugins
	_.each(['main', 'admin', 'editor'], (name) => {
		task(`${theme}.styles.plugins[${name}]`, () => {
			return src(
				join(_paths.plugins[theme], `**/styles/${name}.scss`),
				join(_paths.plugins[theme], `**/styles/${name}.sass`),
			)
				.pipe(_sass(_sassOptions).on('error', _sass.logError))
				.pipe(_postcss([_autoprefixer()]))
				.pipe(dest(_paths.plugins[theme]))
			// .pipe(dest("."))
		})
		task(`clean.${theme}.styles.plugins[${name}]`, (cb) =>
			_delete(join(_paths.plugins[theme], `**/styles/${name}.css`), cb),
		)
	})
	task(
		`clean.${theme}.styles.plugins`,
		parallel(
			`clean.${theme}.styles.plugins[main]`,
			`clean.${theme}.styles.plugins[admin]`,
			`clean.${theme}.styles.plugins[editor]`,
		),
	)
	task(
		`watch.${theme}.styles.plugins`,
		() => watch(
			[
				join(_paths.plugins[theme], `**/styles/*.scss`),
				join(_paths.plugins[theme], `**/styles/*.sass`),
			],
			parallel(`${theme}.styles.plugins`),
		),
	)
	task(
		`${theme}.styles.plugins`,
		series(
			`clean.${theme}.styles.plugins`,
			parallel(
				`${theme}.styles.plugins[main]`,
				`${theme}.styles.plugins[admin]`,
				`${theme}.styles.plugins[editor]`,
			),
		),
	)

	task(
		`clean.${theme}.scripts`,
		parallel(_buildSets.map((name) => `clean.${theme}.scripts.${name}`)),
	)
	task(
		`watch.${theme}.scripts`,
		parallel(_buildSets.map((name) => `watch.${theme}.scripts.${name}`)),
	)
	task(
		`${theme}.scripts`,
		series(
			`clean.${theme}.scripts`,
			parallel(_buildSets.map((name) => `${theme}.scripts.${name}`)),
		),
	)

	task(
		`clean.${theme}.vendor.styles`,
		parallel(_buildSets.map((name) => `clean.${theme}.vendor.styles.${name}`)),
	)
	task(
		`${theme}.vendor.styles`,
		series(
			`clean.${theme}.vendor.styles`,
			parallel(_buildSets.map((name) => `${theme}.vendor.styles.${name}`)),
		),
	)

	task(
		`clean.${theme}.vendor.scripts`,
		parallel(_buildSets.map((name) => `clean.${theme}.vendor.scripts.${name}`)),
	)
	task(
		`${theme}.vendor.scripts`,
		series(
			`clean.${theme}.vendor.scripts`,
			parallel(_buildSets.map((name) => `${theme}.vendor.scripts.${name}`)),
		),
	)

	// vendor copy
	const copyTasks = []
	const copyTasksClean = []
	_.forEach(vendorJson.copy, (destination, glob) => {
		const taskName = `${theme}.vendor.copy {"${glob}": "${destination}"}`
		const taskCleanName = `clean.${theme}.vendor.copy {"${glob}": "${destination}"}`

		task(taskName, (cb) => {
			if (_isValidGlob(glob)) {
				return src(glob).pipe(dest(join(_paths.build[theme], destination)))
			}
			cb()
		})
		task(taskCleanName, (cb) => {
			return _delete(join(_paths.build[theme], destination), cb)
		})

		copyTasks.push(taskName)
		copyTasksClean.push(taskCleanName)
		_hasVendorCopyTasks = true
	})
	if (_hasVendorCopyTasks) {
		task(`clean.${theme}.vendor.copy`, parallel(copyTasksClean))
		task(
			`${theme}.vendor.copy`,
			series(`clean.${theme}.vendor.copy`, parallel(copyTasks)),
		)
	}
})

task(`clean.styles`, parallel(_themes.map((theme) => `clean.${theme}.styles`)))
task(`watch.styles`, parallel(_themes.map((theme) => `watch.${theme}.styles`)))
task(
	`styles`,
	series(`clean.styles`, parallel(_themes.map((theme) => `${theme}.styles`))),
)

task(
	`clean.styles.plugins`,
	parallel(_themes.map((theme) => `clean.${theme}.styles.plugins`)),
)
task(
	`watch.styles.plugins`,
	parallel(_themes.map((theme) => `watch.${theme}.styles.plugins`)),
)
task(
	`styles.plugins`,
	series(
		`clean.styles.plugins`,
		parallel(_themes.map((theme) => `${theme}.styles.plugins`)),
	),
)

task(
	`clean.scripts`,
	parallel(_themes.map((theme) => `clean.${theme}.scripts`)),
)
task(
	`watch.scripts`,
	parallel(_themes.map((theme) => `watch.${theme}.scripts`)),
)
task(
	`scripts`,
	series(`clean.scripts`, parallel(_themes.map((theme) => `${theme}.scripts`))),
)

task(
	`clean.vendor.styles`,
	parallel(_themes.map((theme) => `clean.${theme}.vendor.styles`)),
)
task(
	`vendor.styles`,
	series(
		`clean.vendor.styles`,
		parallel(_themes.map((theme) => `${theme}.vendor.styles`)),
	),
)

task(
	`clean.vendor.scripts`,
	parallel(_themes.map((theme) => `clean.${theme}.vendor.scripts`)),
)
task(
	`vendor.scripts`,
	series(
		`clean.vendor.scripts`,
		parallel(_themes.map((theme) => `${theme}.vendor.scripts`)),
	),
)

if (_hasVendorCopyTasks) {
	task(
		`clean.vendor.copy`,
		parallel(_themes.map((theme) => `clean.${theme}.vendor.copy`)),
	)
	task(
		`vendor.copy`,
		series(
			`clean.vendor.copy`,
			parallel(_themes.map((theme) => `${theme}.vendor.copy`)),
		),
	)
} else {
	task(`vendor.copy`, (cb) => {
		cb()
	})
}

task(
	'default',
	series(
		'clean',
		parallel(
			'styles',
			'styles.plugins',
			'scripts',
			'vendor.styles',
			'vendor.scripts',
			'vendor.copy',
		),
	),
)

task(
	'watch',
	series(
		'default',
		parallel('watch.styles', 'watch.styles.plugins', 'watch.scripts'),
	),
)
// END TASKS
