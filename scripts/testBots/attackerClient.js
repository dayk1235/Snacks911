import axios from "axios";

const API_URL = "http://localhost:3000/api/webhook";

const run = async () => {
    const phone = "5219999999999";

    console.log("🔴 Atacante iniciado");

    const requests = [];

    for (let i = 0; i < 50; i++) {
        requests.push(
            axios.post(API_URL, {
                from: phone,
                message: "hola",
            }).catch(e => e.response?.status)
        );
    }

    const results = await Promise.all(requests);

    console.log("Resultados:", results);
};

run();