import axios from "axios";

const API_URL = "http://localhost:3000/api/webhook";

const run = async () => {
    const phone = "521" + Math.floor(Math.random() * 1000000000);
    const referralCode = "WINGS-1234"; // usa uno real

    console.log("🟡 Cliente con referido:", phone);

    await axios.post(API_URL, {
        from: phone,
        message: `Hola tengo código ${referralCode}`,
    });

    await axios.post(API_URL, {
        from: phone,
        message: "Quiero boneless",
    });

    await axios.post(API_URL, {
        from: phone,
        message: "Confirmar pedido",
    });

    console.log("✅ Referido probado");
};

run();