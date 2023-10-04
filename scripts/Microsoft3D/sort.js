const fs = require('fs')
const converter = require("discord-emoji-converter")
const config = require("./config.js")

const fluentEmojiPath = config["fluentui-emoji-path"] + "/assets"
const sortedPath = config["sorted-path"]

const oldCss = ["https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/spritesheets.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/activity.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/flags.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/food.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/nature.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/objects.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/people.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/spritesheets.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/symbols.css", "https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft/travel.css",]
const skinTones = {
	"Default": "", "Light": "tone1", "Medium-Light": "tone2", "Medium": "tone3", "Medium-Dark": "tone4", "Dark": "tone5"
}
const emojiMetaData = {}
const emojiList = {}
const skinToneEmojis = {}
const discordEmojiData = {}
let discordSpriteSheets = {}
const groups = {}

async function downloadCSS() {
	await fs.mkdirSync(`${sortedPath}/css`);
	await fs.mkdirSync(`${sortedPath}/css/Old`);
	return Promise.all(oldCss.map(async (css) => {
		const cssData = await fetch(css)
		const cssText = await cssData.text()

		const category = css.split("/").pop().replace(".css", "")

		if (!fs.existsSync(`${sortedPath}/css/Old/`)) {
			await fs.mkdirSync(`${sortedPath}/css/Old/`);
		}

		await fs.writeFileSync(`${sortedPath}/css/Old/${category}.css`, cssText)
	}))
}

async function sortOldCSS() {
	const oldCssFiles = fs.readdirSync(`${sortedPath}/css/Old`)
	oldCssFiles.splice(oldCssFiles.indexOf("spritesheets.css"), 1)

	oldCssFiles.forEach((cssFile) => {
		const fileName = cssFile.replace(".css", "")
		discordEmojiData[fileName] = {}
		const css = fs.readFileSync(`${sortedPath}/css/Old/${cssFile}`, 'utf8')
		const blocks = css.split(/\* .* \*/).map(block => block.trim()).filter(Boolean)

		blocks.forEach(block => {
			const assetMatches = block.match(/\/assets\/([\w\d]+\.svg)/g)
			const emojiMatches = block.match(/https:\/\/raw\.githubusercontent\.com\/Lythium4848\/EmojiReplace\/master\/emojis\/Microsoft\/(\w+)\/(\w+\.\w+)"\)/)

			if (assetMatches && emojiMatches && assetMatches.length > 0 && emojiMatches.length > 1) {
				const emoji = emojiMatches[2].replace(".png", "")
				discordEmojiData[fileName][emoji] = {
					name: emoji, assets: assetMatches[0]
				}
			}
		})
	});

	fs.writeFileSync(`${sortedPath}/discordEmojiData.json`, JSON.stringify(discordEmojiData))

	const oldSpriteSheetsCSS = fs.readFileSync(`${sortedPath}/css/Old/spritesheets.css`, 'utf8')
	let matches = oldSpriteSheetsCSS.match(/url\("\/assets\/([^"]+)"\)/g);

	matches = matches.map((match) => {
		return match.replace(/url\("(.*)"\)/, "$1");
	});

	discordSpriteSheets = matches
}

async function getMetaData() {
	const folders = fs.readdirSync(`${fluentEmojiPath}`)
	return Promise.all(folders.map(async (folder) => {
		const fileContent = fs.readFileSync(`${fluentEmojiPath}/${folder}/metadata.json`, 'utf8')
		const metadata = JSON.parse(fileContent)

		metadata.cldr = folder

		let name
		if (metadata.glyph === "⚧️") { // Converter plugin cannot get shortcode for these emojis for some reason.
			name = ":transgender_symbol:"
		} else if (metadata.glyph === "👁️‍🗨️") {
			name = ":eye_in_speech_bubble:"
		} else {
			name = converter.getShortcode(metadata.glyph)
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
			path: `${fluentEmojiPath}/${folder}`,
			copyPath: `${sortedPath}/emojis/${group}`,
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
				skinToneEmojis[skinToneName] = emojiList[skinToneName]
			}
		} else {
			emojiList[name] = {
				name: name, group: group, glyph: metadata.glyph
			}
		}

		if (!groups[group]) {
			groups[group] = true
		}


		fs.writeFileSync(`${fluentEmojiPath}/${folder}/metadata.json`, JSON.stringify(metadata))
	}))
}

async function copyEmojis() {
	await fs.mkdirSync(`${sortedPath}/emojis`);
	return Promise.all(Object.keys(emojiMetaData).map(async (emoji) => {
		const emojiData = emojiMetaData[emoji]
		const emojiName = emojiData.name
		const emojiCldr = emojiData.cldr.toLowerCase().replace(/ /g, "_")
		const emojiGroup = emojiData.group
		const hasSkinTones = emojiData.hasSkinTones

		let fullPath = emojiData.path

		const fileCLDR = `${emojiCldr}_3d`
		const fileName = `${emojiName}`

		if (!fs.existsSync(`${sortedPath}/emojis/${emojiGroup}`)) {
			await fs.mkdirSync(`${sortedPath}/emojis/${emojiGroup}`)
		}

		if (hasSkinTones) {
			for (const tone in skinTones) {
				const skinTone = skinTones[tone]

				let skinTonePath = `${fullPath}/${tone}/3D/${fileCLDR}`
				let copyToPath = `${emojiData.copyPath}/${fileName}`
				let skinToneName

				if (tone === "Default") {
					skinTonePath = `${skinTonePath}_default.png`
					copyToPath = `${copyToPath}.png`
					skinToneName = `${emojiName}`

				} else {
					skinTonePath = `${skinTonePath}_${tone.toLowerCase()}.png`
					copyToPath = `${copyToPath}_${skinTone}.png`
					skinToneName = `${emojiName}_${skinTone}`
				}

				emojiList[skinToneName].finalPath = copyToPath
				await fs.copyFileSync(skinTonePath, copyToPath, fs.constants.COPYFILE_EXCL)
			}

			return
		}

		const copyToPath = `${emojiData.copyPath}/${fileName}.png`
		emojiList[emojiName].finalPath = copyToPath
		await fs.copyFileSync(`${fullPath}/3D/${fileCLDR}.png`, copyToPath, fs.constants.COPYFILE_EXCL)
	}))
}

async function createBaseCSSFiles() {
	await fs.mkdirSync(`${sortedPath}/css/New`);
	let baseData = ``
	baseData += `@import url("https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft3D/spritesheets.css");\n`

	for (const group in groups) {
		fs.writeFileSync(`${sortedPath}/css/New/${group}.css`, ``)
		baseData += `@import url("https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft3D/${group}.css");\n`
	}

	fs.writeFileSync(`${sortedPath}/css/New/base.css`, baseData)
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
}`
			await fs.appendFileSync(`${sortedPath}/css/New/${emojiGroup}.css`, cssData)
		}
	}

	discordSpriteSheets.forEach((spriteSheet) => {
		const cssData = `
.emojiSpriteImage-3ykvhZ[style*="${spriteSheet}"]{
    background-image: url("") !important;
}
			`

		fs.appendFileSync(`${sortedPath}/css/New/spritesheets.css`, cssData)
	})
}

async function generateSpriteSheets(start) {
	await fs.mkdirSync(`${sortedPath}/spritesheets`);

	await fs.appendFileSync(`${sortedPath}/css/New/spritesheets.css`, `
.emoji-4YP39J[src*="/assets/"] {
    display: none;
}`)


	for (const key in emojiList) {
		const emoji = emojiList[key]
		let cssData = `
/* ${emoji.name} */
.emojiItem-277VFM[data-name="${emoji.name}"]:not([data-id])  {
\tbackground-image: url("https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/emojis/Microsoft3D/${emoji.group}/${emoji.name}.png") !important;
    background-size: contain !important;
}
		`

		await fs.appendFileSync(`${sortedPath}/css/New/spritesheets.css`, cssData)
	}


	await fs.mkdirSync(`${sortedPath}/css/New/picker`)
	for (const group in discordEmojiData) {
		const groupData = discordEmojiData[group]
		for (const emoji in groupData) {
			const emojiData = groupData[emoji]
			const emojiGroup = emojiList[emojiData.name]?.group
			if (!emojiGroup) continue

			let cssData = `
.graphicPrimary-jNHB2G:has(.emoji-4YP39J[src="${emojiData.assets}"]) {
    background-image: url("https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/emojis/Microsoft3D/${emojiGroup}/${emojiData.name}.png") !important;
    background-size: contain !important;
}`

			await fs.appendFileSync(`${sortedPath}/css/New/picker/${emojiGroup}.css`, cssData)
		}
	}

	let importData = ``
	for (const group in groups) {
		importData += `@import url("https://raw.githubusercontent.com/Lythium4848/EmojiReplace/master/src/Microsoft3D/picker/${group}.css");\n`
	}

	fs.appendFileSync(`${sortedPath}/css/New/spritesheets.css`, importData)
}

async function main() {
	if (fs.existsSync(`${sortedPath}`)) {
		await fs.rmSync(`${sortedPath}`, {recursive: true});
	}
	await fs.mkdirSync(`${sortedPath}`);

	await downloadCSS()
	console.log("Downloaded old CSS files.")

	await sortOldCSS()
	console.log("Sorted old CSS files.")

	await getMetaData()
	console.log("Fixed metadata.")

	await fs.writeFileSync(`${sortedPath}/emojiMetaData.json`, JSON.stringify(emojiMetaData))
	await fs.writeFileSync(`${sortedPath}/emojiList.json`, JSON.stringify(emojiList))

	await createBaseCSSFiles()
	console.log("Created base CSS files.")

	await copyEmojis()
	console.log("Copied emojis.")

	await createNewCSS()
	console.log("Created new CSS files.")

	await generateSpriteSheets()
	console.log("Generated spritesheets.")

}

main().then(r => {
})
