#!/usr/bin/env node

const admin = require('firebase-admin')
const fs = require('fs')
const select = require('@inquirer/select').default


const FILENAME = process.argv[2]
if (!fs.existsSync(FILENAME)) process.exit(1);

admin.initializeApp({
	credential: admin.credential.cert("./service_key.json")
})

async function main(){

	const data = JSON.parse(fs.readFileSync(FILENAME).toString())

	const keys = Object.keys(data[0])
	const keyField = await select({
		message: "Select the field to be used as a key for the documents",
		choices: keys.map(k => ({value:k})),
		default: keys.includes("id") ? "id" : null
	});

	if (data.some(d => !Object.keys(d).includes(keyField))){
		console.error("Not all data contains key field")
		process.exit(1)
	}

	const promises = [];
	data.forEach(d => {
		console.log(d)
		promises.push(admin.firestore().collection(FILENAME.split(".")[0]).doc(d[keyField]).set(d));
	})

	await Promise.all(promises);

}
main();
