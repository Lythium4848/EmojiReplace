const fs = require('fs')
const coverter = require("discord-emoji-converter")

const oldCss = ["https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/activity.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/flags.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/food.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/nature.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/objects.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/people.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/spritesheets.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/symbols.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/travel.css",]
const skinTones = {
	"Default": "", "Light": "tone1", "Medium-Light": "tone2", "Medium": "tone3", "Medium-Dark": "tone4", "Dark": "tone5"
}
const emojiMetaData = {}
const emojiList = {}
const discordEmojiData = {}
const groups = {}

async function downloadCSS() {
	await fs.mkdirSync('./sorted2/css');
	await fs.mkdirSync('./sorted2/css/Old');
	return Promise.all(oldCss.map(async (css) => {
		const cssData = await fetch(css)
		const cssText = await cssData.text()

		const category = css.split("/").pop().replace(".css", "")

		if (!fs.existsSync('./sorted2/css/Old/')) {
			await fs.mkdirSync('./sorted2/css/Old/');
		}

		await fs.writeFileSync(`./sorted2/css/Old/${category}.css`, cssText)
	}))
}

async function sortOldCSS() {
	const oldCssFiles = fs.readdirSync('./sorted2/css/Old')

	oldCssFiles.forEach((cssFile) => {
		const fileName = cssFile.replace(".css", "")
		discordEmojiData[fileName] = {}
		const css = fs.readFileSync('./sorted2/css/Old/' + cssFile, 'utf8')
		const blocks = css.split(/\* .* \*/).map(block => block.trim()).filter(Boolean)

		blocks.forEach(block => {
			const assetMatches = block.match(/\/assets\/([\w\d]+\.svg)/g)
			const emojiMatches = block.match(/https:\/\/mwittrien\.github\.io\/BetterDiscordAddons\/Themes\/EmojiReplace\/emojis\/Microsoft\/(\w+)\/(\w+\.\w+)"\)/)

			if (assetMatches && emojiMatches && assetMatches.length > 0 && emojiMatches.length > 1) {
				const emoji = emojiMatches[2].replace(".png", "")
				discordEmojiData[fileName][emoji] = {
					name: emoji, assets: assetMatches[0]
				}
			}
		})
	});

	fs.writeFileSync('./sorted2/discordEmojiData.json', JSON.stringify(discordEmojiData))
}

async function getMetaData() {
	const folders = fs.readdirSync('./assets')
	return Promise.all(folders.map(async (folder) => {
		const fileContent = fs.readFileSync(`./assets/${folder}/metadata.json`, 'utf8')
		const metadata = JSON.parse(fileContent)

		metadata.cldr = folder

		let name
		if (metadata.glyph === "⚧️") { // Converter plugin cannot get shortcode for these emojis for some reason.
			name = ":transgender_symbol:"
		} else if (metadata.glyph === "👁️‍🗨️") {
			name = ":eye_in_speech_bubble:"
		} else {
			name = coverter.getShortcode(metadata.glyph)
		}

		const cldr = metadata.cldr.replace(/[“”:’()]/g, "").replace("*", "asterisk").replace("#", "hashtag")

		name = name.replace(/:/g, "")
		const group = metadata.group.toLowerCase().replace(/ /g, "_").replace(/&/g, "and")
		const hasSkinTones = metadata.unicodeSkintones && true || false

		emojiMetaData[metadata.glyph] = {
			glpyh: metadata.glyph,
			cldr: cldr,
			name: name,
			hasSkinTones: hasSkinTones,
			path: `./assets/${folder}`,
			copyPath: `./sorted2/emojis/${group}`,
			group: group
		}

		if (hasSkinTones) {
			for (const tone in skinTones) {
				const skinTone = skinTones[tone]
				let skinToneName
				if (tone === "Default") {
					skinToneName = `${name}`
				} else {
					skinToneName = `${name}_${skinTone}`
				}

				emojiList[skinToneName] = {
					name: skinToneName, group: group, glyph: metadata.glyph
				}
			}
		} else {
			emojiList[name] = {
				name: name, group: group, glyph: metadata.glyph
			}
		}

		if (!groups[group]) {
			groups[group] = true
		}


		fs.writeFileSync(`./assets/${folder}/metadata.json`, JSON.stringify(metadata))
	}))
}

async function copyEmojis() {
	await fs.mkdirSync('./sorted2/emojis');
	return Promise.all(Object.keys(emojiMetaData).map(async (emoji) => {
		const emojiData = emojiMetaData[emoji]
		const emojiName = emojiData.name
		const emojiCldr = emojiData.cldr.toLowerCase().replace(/ /g, "_")
		const emojiGroup = emojiData.group
		const hasSkinTones = emojiData.hasSkinTones

		let fullPath = emojiData.path

		const fileCLDR = `${emojiCldr}_3d`
		const fileName = `${emojiName}`

		if (!fs.existsSync(`./sorted2/emojis/${emojiGroup}`)) {
			await fs.mkdirSync(`./sorted2/emojis/${emojiGroup}`)
		}

		if (hasSkinTones) {
			for (const tone in skinTones) {
				const skinTone = skinTones[tone]

				let skinTonePath = `${fullPath}/${tone}/3D/${fileCLDR}`
				let copyToPath = `${emojiData.copyPath}/${fileName}`

				if (tone === "Default") {
					skinTonePath = `${skinTonePath}_default.png`
					copyToPath = `${copyToPath}.png`
				} else {
					skinTonePath = `${skinTonePath}_${tone.toLowerCase()}.png`
					copyToPath = `${copyToPath}_${skinTone}.png`
				}

				await fs.copyFileSync(skinTonePath, copyToPath, fs.constants.COPYFILE_EXCL)
			}

			return
		}

		await fs.copyFileSync(`${fullPath}/3D/${fileCLDR}.png`, `${emojiData.copyPath}/${fileName}.png`, fs.constants.COPYFILE_EXCL)
	}))
}

async function createBaseCSSFiles() {
	await fs.mkdirSync('./sorted2/css/New');
	let baseData = ``

	for (const group in groups) {
		fs.writeFileSync(`./sorted2/css/New/${group}.css`, ``)
		baseData += `@import url("https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft3D/${group}.css");\n`
	}

	fs.writeFileSync(`./sorted2/css/New/base.css`, baseData)
}

async function createNewCSS() {
	for (const group in discordEmojiData) {
		const groupData = discordEmojiData[group]
		for (const emoji in groupData) {
			const emojiData = groupData[emoji]
			const emojiGroup = emojiList[emojiData.name]?.group
			if (!emojiGroup) continue
			let cssData = `
/* ${emojiData.name} */
.diversityEmojiItemImage-1pfGqI[src='${emojiData.assets}'], .diversityEmojiItemImage-1pfGqI[style*='background-image: url("${emojiData.assets}")'], 
.image-3tDi44[src='${emojiData.assets}'], .image-3tDi44[style*='background-image: url("${emojiData.assets}")'], 
.emoji-4YP39J[src='${emojiData.assets}'], .emoji-4YP39J[style*='background-image: url("${emojiData.assets}")'], 
.emojiImage-1mTIfi[src='${emojiData.assets}'], .emojiImage-1mTIfi[style*='background-image: url("${emojiData.assets}")'], 
.image-2c9fiD[src='${emojiData.assets}'], .image-2c9fiD[style*='background-image: url("${emojiData.assets}")'], 
.icon-Yl4xbA[src='${emojiData.assets}'], .icon-Yl4xbA[style*='background-image: url("${emojiData.assets}")'], 
.emoji-1kNQp2[src='${emojiData.assets}'], .emoji-1kNQp2[style*='background-image: url("${emojiData.assets}")'], 
.roleIcon-3-WL_I[src='${emojiData.assets}'], .roleIcon-3-WL_I[style*='background-image: url("${emojiData.assets}")'], 
.emoji[src='${emojiData.assets}'], .emoji[style*='background-image: url("${emojiData.assets}")'] {
	background: transparent !important;
	content: url("https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/emojis/Microsoft3D/${emojiGroup}/${emojiData.name}.png") !important;
}\n`
			fs.appendFileSync(`./sorted2/css/New/${emojiGroup}.css`, cssData)
		}
	}
}

async function main() {
	if (fs.existsSync('./sorted2')) {
		await fs.rmSync('./sorted2', {recursive: true});
	}
	await fs.mkdirSync('./sorted2');

	await downloadCSS()
	console.log("Downloaded old CSS files.")

	await sortOldCSS()
	console.log("Sorted old CSS files.")

	await getMetaData()
	console.log("Fixed metadata.")

	await fs.writeFileSync('./sorted2/emojiMetaData.json', JSON.stringify(emojiMetaData))
	await fs.writeFileSync('./sorted2/emojiList.json', JSON.stringify(emojiList))

	await createBaseCSSFiles()
	console.log("Created base CSS files.")

	await copyEmojis()
	console.log("Copied emojis.")

	await createNewCSS()
	console.log("Created new CSS files.")

}

main().then(r => {
})
