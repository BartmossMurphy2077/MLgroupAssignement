document.addEventListener("DOMContentLoaded", async () => {
    const form = document.getElementById("input-form");
    const resBox = document.getElementById("result");

    const recruiterKeys = [
        "recruiterRelationIntimatePartner",
        "recruiterRelationFriend",
        "recruiterRelationFamily",
        "recruiterRelationOther",
        "recruiterRelationUnknown"
    ];

    // Dropdown helper
    function createDropdown(label, name, options) {
        const div = document.createElement("div");
        div.className = "mb-4";

        const lbl = document.createElement("label");
        lbl.className = "block text-sm font-medium text-gray-200";
        lbl.textContent = label;
        lbl.setAttribute("for", name);

        const select = document.createElement("select");
        select.className = "mt-1 block w-full border border-gray-300 text-black rounded-md p-2";
        select.name = name;
        select.id = name;

        options.forEach(opt => {
            const option = document.createElement("option");
            option.value = opt;
            option.textContent = opt;
            select.appendChild(option);
        });

        div.appendChild(lbl);
        div.appendChild(select);
        form.appendChild(div);
    }

    // Age range fields
    function createNumberInput(label, name) {
        const div = document.createElement("div");
        div.className = "mb-4";

        const lbl = document.createElement("label");
        lbl.className = "block text-sm font-medium text-gray-200";
        lbl.textContent = label;
        lbl.setAttribute("for", name);

        const input = document.createElement("input");
        input.className = "mt-1 block text-black w-full border border-gray-300 rounded-md p-2";
        input.name = name;
        input.id = name;
        input.type = "number";

        div.appendChild(lbl);
        div.appendChild(input);
        form.appendChild(div);
    }

    // Create dropdowns
    createDropdown("Gender", "gender", ["Male", "Female", "Other"]);
    createDropdown("Citizenship Status", "citizenship", ["Yes", "No", "Unknown"]);
    createDropdown("Country of Origin", "origin_region", ['AF', 'AL', 'BD', 'BF', 'BG', 'BO', 'BY', 'CD', 'CI', 'CN', 'CO', 'ER', 'GH', 'GN', 'GW', 'HT', 'ID', 'KE', 'KG', 'KH', 'KR', 'KZ', 'LA', 'LK', 'MD', 'MG', 'ML', 'MM', 'MX', 'NE', 'NG', 'NP', 'PH', 'RO', 'SL', 'SN', 'TH', 'TJ', 'TM', 'UA', 'UG', 'US', 'UZ', 'VN', 'Other']);
    createDropdown("Country of Citizenship", "citizenship_country", ['AF', 'AL', 'BD', 'BF', 'BG', 'BO', 'BY', 'CD', 'CI', 'CN', 'CO', 'ER', 'GH', 'GN', 'GW', 'HT', 'ID', 'KE', 'KG', 'KH', 'KR', 'KZ', 'LA', 'LK', 'MD', 'MG', 'ML', 'MM', 'MX', 'NE', 'NG', 'NP', 'PH', 'RO', 'SL', 'SN', 'TH', 'TJ', 'TM', 'UA', 'UG', 'US', 'UZ', 'VN', 'Other']);

    // Recruiter relationship dropdown
    const dropdownDiv = document.createElement("div");
    dropdownDiv.className = "mb-4";

    const dropdownLabel = document.createElement("label");
    dropdownLabel.className = "block text-lg font-semibold mb-2";
    dropdownLabel.textContent = "Recruiter Relationship";

    const select = document.createElement("select");
    select.className = "block text-black w-full border border-gray-300 rounded-md p-2";
    select.name = "recruiterRelationship";
    select.id = "recruiterRelationship";

    recruiterKeys.forEach(key => {
        const option = document.createElement("option");
        option.value = key;
        option.textContent = key.replace("recruiterRelation", "").replace(/([A-Z])/g, ' $1').trim();
        select.appendChild(option);
    });

    dropdownDiv.appendChild(dropdownLabel);
    dropdownDiv.appendChild(select);
    form.appendChild(dropdownDiv);

    
    
    createDropdown("Year of Registration", "year_of_registration", [2002, 2003, 2004, 2005, 2006, 2007, 2008, 2009, 2010, 2011, 2012, 2013, 2014, 2015, 2016, 2017, 2018, 2019]);

// Add minimum and maximum age inputs
    createNumberInput("Minimum Age", "age_min");
    createNumberInput("Maximum Age", "age_max");

    // Predict button
    document.getElementById("predict-btn").addEventListener("click", async () => {
        const inputs = form.querySelectorAll("input, select");
        const data = {};

        inputs.forEach(input => {
            if (input.name === "recruiterRelationship") {
                recruiterKeys.forEach(key => {
                    data[key] = (input.value === key) ? 1 : -99;
                });
            } else {
                data[input.name] = input.value;
            }
        });

        const minAge = parseFloat(data.age_min || "0");
        const maxAge = parseFloat(data.age_max || "0");
        data.age_avg = ((minAge + maxAge) / 2).toFixed(1);

        const avg = parseFloat(data.age_avg);
        const majority = avg >= 20 ? "adult" : "minor";
        data.majorityStatus = majority;
        data.majorityStatusAtExploit = majority;
        data.majorityEntry = majority;

        data.exploit_count = 1;
        data.num_recruiter_relations = 1;
        data.recruiter_relation_bin = 1;
        data.ever_minor = avg < 18 ? 1 : 0;
        data.citizenship = 1;

        const resp = await fetch("/predict", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await resp.json();
        resBox.innerHTML = `
            <div>Predicted Exploitation Types: <strong>${(result.predicted_exploitation_types || []).join(', ')}</strong></div>
            <div>Predicted Means of Control: <strong>${result.predicted_means_of_control || "None"}</strong></div>
        `;
    });

    // Add Randomize button
    const randomBtn = document.createElement("button");
    randomBtn.id = "randomize-btn";
    randomBtn.textContent = "Randomize";
    randomBtn.className = "ml-4 bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded";
    document.getElementById("predict-btn").after(randomBtn);

    randomBtn.addEventListener("click", () => {
        const selects = form.querySelectorAll("select");
        selects.forEach(select => {
            const options = Array.from(select.options);
            const randomOption = options[Math.floor(Math.random() * options.length)];
            select.value = randomOption.value;
        });

        const inputs = form.querySelectorAll("input[type='number']");
        inputs.forEach(input => {
            input.value = Math.floor(Math.random() * 30 + 10);
        });
    });
});