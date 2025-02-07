import asyncio
import websockets

async def hello():
    uri = "wss://po-go.onrender.com/"
    async with websockets.connect(uri) as websocket:
        await websocket.send("HELLO")
        print(f"Sent: HELLO")

        response = await websocket.recv()
        print(f"Received: {response}")

asyncio.get_event_loop().run_until_complete(hello())