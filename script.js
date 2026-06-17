function toggleTheme() {

    const current =
        document.documentElement.getAttribute(
            "data-theme"
        );

    if (current === "dark") {

        document.documentElement.removeAttribute(
            "data-theme"
        );

        localStorage.setItem(
            "theme",
            "light"
        );

    } else {

        document.documentElement.setAttribute(
            "data-theme",
            "dark"
        );

        localStorage.setItem(
            "theme",
            "dark"
        );
    }
}

window.addEventListener("load", () => {

    const saved =
        localStorage.getItem("theme");

    if (saved === "dark") {

        document.documentElement.setAttribute(
            "data-theme",
            "dark"
        );
    }
});


let currentBibtex = "";


async function fetchBibtex(doi) {

    const url =
        `https://api.crossref.org/works/${doi}/transform/application/x-bibtex`;

    const response = await fetch(url, {
        headers: {
            "Accept": "application/x-bibtex"
        }
    });

    if (!response.ok) {
        throw new Error(`Failed DOI: ${doi}`);
    }

    return await response.text();
}


function cleanDOI(raw) {

    return raw
        .replace(/https?:\/\/(dx\.)?doi\.org\//, "")
        .replace(/^doi:\s*/i, "")
        .trim();
}


function replaceCitationKey(bibtex, newKey) {

    return bibtex.replace(
        /@(\w+)\{([^,]+),/,
        `@$1{${newKey},`
    );
}


async function generateBibtex() {

    const input =
        document.getElementById("input").value;

    const lines =
        input.split("\n");

    let output = "";

    const status =
        document.getElementById("status");

    status.innerText = "Generating...";

    for (const line of lines) {

        if (!line.includes("|")) {
            continue;
        }

        const parts =
            line.split("|");

        const citationKey =
            parts[0].trim();

        const rawDOI =
            parts[1].trim();

        const doi =
            cleanDOI(rawDOI);

        try {

            let bibtex =
                await fetchBibtex(doi);

            bibtex =
                replaceCitationKey(
                    bibtex,
                    citationKey
                );

            output += bibtex + "\n\n";

        } catch (error) {

            output +=
                `% ERROR: ${doi}\n\n`;

            console.error(error);
        }
    }

    currentBibtex = output;

    document.getElementById("output").value =
        currentBibtex;

    status.innerHTML =
    `✅ Generated ${lines.length} entries`;}


async function copyBibtex() {

    if (!currentBibtex) {
        alert("No bibliography generated yet.");
        return;
    }

    try {

        await navigator.clipboard.writeText(
            currentBibtex
        );

        alert("Copied to clipboard!");

    } catch (err) {

        alert("Failed to copy.");
    }
}


function downloadCurrentBib() {

    if (!currentBibtex) {
        alert("No bibliography generated yet.");
        return;
    }

    const blob =
        new Blob([currentBibtex],
        { type: "text/plain" });

    const url =
        URL.createObjectURL(blob);

    const a =
        document.createElement("a");

    a.href = url;

    a.download = "references.bib";

    a.click();

    URL.revokeObjectURL(url);
}
