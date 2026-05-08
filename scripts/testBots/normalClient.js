import axios from "axios";
import { v4 as uuid } from "uuid";

const API_URL = "http://localhost:3000/api/webhook"; // ajusta si usas otro endpoint

const simulateMessage = async (phone, message) => {
    return axios.post(API_URL, {
        from: phone,
        message: message,
    });
};

const run = async () => {
    const phone = "521" + Math.floor(Math.random() * 1000000000);

    console.log("🟢 Cliente:", phone);

    await simulateMessage(phone, "Hola");
    await simulateMessage(phone, "¿Qué tienes?");
    await simulateMessage(phone, "Quiero unas papas");
    await simulateMessage(phone, "Confirmar pedido");

    console.log("✅ Flujo completado");
};

run();