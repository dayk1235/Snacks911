import axios from "axios";

const API_URL = "http://localhost:3000/api/webhook";

const tenants = [
    { phone: "5211111111111", name: "Tacos" },
    { phone: "5212222222222", name: "Alitas" },
];

const run = async () => {
    for (const t of tenants) {
        console.log(`Testing tenant: ${t.name}`);

        await axios.post(API_URL, {
            from: t.phone,
            message: "Hola",
        });
    }
};

run();