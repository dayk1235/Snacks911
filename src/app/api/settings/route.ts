export async function GET() {
  return Response.json({
    storeName: "Snacks 911",
    open: true,
    currency: "MXN"
  });
}
