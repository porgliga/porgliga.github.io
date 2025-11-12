const pass = prompt("Heslo")
if (pass==="") throw Error();

const prompts = {
    "date": {
		text: "Nové datum ve formátu DD.MM.YYYY (např. 28.9.2024)",
		validate: (t) => new RegExp(/^([0-2]?[0-9]|3[0-1])\.(0?[1-9]|1[0-2])\.20[0-2][0-6]$/).test(t)
	},
    "time": {
		text: "Nový čas ve 24-hodinovém formátu (např: 14:25)",
		validate: (t) => new RegExp(/^([0-1][0-9]|2[0-3]):([0-5][0-9])$/).test(t)
	},
    "score": {
		text: "Nové skóre rozdělené dvojtečkou (např: 8:2)",
		validate: (t) => new RegExp(/^\d+:\d+$/).test(t)
	},
    "event": {
		text: "Nová událost, tak jak by se měla zobrazit (např. Z! Novotný)\nZkratky: Z! => 🟨, C! => 🟥, G! => ⚽",
		validate: (t) => true
	}
}

const sucessTexts = {
    "date": "Nové datum: {0}",
    "time": "Nový čas: {0}",
    "score": "{0}",
    "event": "Přidáno"
}
async function onClick(el, dataType, dataParse = (a)=>a){
    const value = dataParse(prompt(prompts[dataType].text));
    if(!value) return null;
	if (!prompts[dataType].validate(value)) return alert("Nesprávný formát.");
    const obj = { id: el.closest("div[data-matchid]").dataset.matchid };
    obj[dataType] = value;

    el.style.color = "#ffffff";
    el.innerText = "Načítání..."
    try {
        const res = await fetch(FIREBASE_BASEURL + "updateMatch?pass="+pass, {method: "PATCH", body: JSON.stringify(obj)})
        switch (res.status) {
            case 204:
            case 200:
                el.style.color = "#166e00";
                el.innerText = sucessTexts[dataType].replace("{0}", value);
                return true;
            case 401:
                el.style.color = "#920000"
                el.innerText = "Nesprávné heslo";
                return false;
            default:
                el.style.color = "#920000"
                el.innerText = "Neznámá chyba"
                console.error(res.body.toString());
                return false;
        }
    } catch(err) {
        el.style.color = "#920000"
        el.innerText = "Neznámá chyba"
        console.error(err);
        return false;
    }
}


loadMatches(true).then(() => {
    const wrapperEvents = document.querySelectorAll(".match-event-wrapper")
    const leftEvents = document.querySelectorAll(".match-event-wrapper > div.left")
    const rightEvents = document.querySelectorAll(".match-event-wrapper > div.right")

    for (const listEl of [...leftEvents, ...rightEvents]){

            for (const el of listEl.children) {
                let backupText = el.innerText;
                el.style.cursor = "pointer"
                el.addEventListener("mouseover", () => {
                    el.style.color = "#920000"
                    el.innerText = "SMAZAT?"
                });
                el.addEventListener("mouseout", () => {
                    el.style.color = "#fff"
                    el.innerText = backupText;
                });
                el.addEventListener("click", () => {
                    const id = el.closest("div[data-matchid]").dataset.matchid;
                    el.remove();
                    fetch(FIREBASE_BASEURL + "updateMatch?pass=" + pass, {
                        method: "PATCH", body: JSON.stringify({
                            id,
                            event: {
                                left: listEl.className.includes("left"),
                                value: [...listEl.children].slice(0, -1).map(ch => ch.innerText).join("\n")
                            }
                        })
                    })
                })
            }

        if (listEl.parentNode.classList.contains("empty")){
            [...listEl.children].forEach(ch => ch.remove()) //remove empty p tag
        }
        const addElFrag = document.createElement("p")
        addElFrag.classList.add("addElement")
        addElFrag.innerText = "PŘIDAT EVENT"
        const addEl = listEl.appendChild(addElFrag)

        addEl.style.outline = "2px solid white"
        addEl.style.cursor = "pointer"
        addEl.onclick = function(){
            const frag = document.createElement("p");
            frag.classList.add("draft");

            let newText;
            const draftEl = listEl.insertBefore(frag, addEl)
            onClick(draftEl, "event", (txt) => {
                newText = txt.replaceAll("Z!", "🟨").replaceAll("C!", "🟥").replaceAll("G!", "⚽")
                return {
                    left: listEl.className.includes("left"),
                    value: [...listEl.children].slice(0, -2).map(ch => ch.innerText).join("\n") + `\n${newText}`
                };
            }).then(res => {
                if (!res) {
                    if (res === false) {
                        addEl.style.color = draftEl.style.color;
                        addEl.innerText = draftEl.innerText;
                    }
                    draftEl.remove();
                }
                if (res) {
                    draftEl.innerText = newText;
                    draftEl.classList.remove("draft");
                }
            })
        }
    }
    for (const wrapperEl of wrapperEvents){
        if (wrapperEl.classList.contains("empty")) wrapperEl.classList.remove("empty");
    }

    const dateEl = document.getElementsByClassName("settable-date");
    const timeEl = document.getElementsByClassName("settable-time");
    const scoreEl = document.getElementsByClassName("settable-score")
    for (const el of [...dateEl, ...timeEl, ...scoreEl]) {
        el.addEventListener("mouseover", (e) => {
            if (e.target.innerText.startsWith("BEZ DANÉHO")) {
                e.target.innerText = "NASTAVIT";
            }
            e.target.style.outline = "2px solid white"
            e.target.style.cursor = "pointer"

            // get the part after "settable" as property name from classname
            e.target.onclick = (e)=>onClick(e.target, el.className.split(" ").find(cl => cl.startsWith("settable")).split("-")[1])
        })

        if (el.classList.contains("settable-date")){
            el.addEventListener("mouseout", (e) => {
                if (e.target.innerText === "NASTAVIT") {
                    e.target.innerText = "BEZ DANÉHO DATA";
                }
                e.target.style.outline = "none"
                e.target.style.cursor = "auto"
                e.target.onclick = null;
            })
        } else if (el.classList.contains("settable-time")) {
            el.addEventListener("mouseout", (e) => {
                if (e.target.innerText === "NASTAVIT") {
                    e.target.innerText = "BEZ DANÉHO ČASU";
                }
                e.target.style.outline = "none"
                e.target.style.cursor = "auto"
                e.target.onclick = null
            })
        } else if (el.classList.contains("settable-score")) {
            el.addEventListener("mouseout", (e) => {
                if (e.target.innerText === "NASTAVIT"){
                    e.target.innerText = "- : -";
                }
                e.target.style.outline = "none"
                e.target.style.cursor = "auto"
                e.target.onclick = null
            })
        }
    }
});
