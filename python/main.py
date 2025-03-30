from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import httpx

evennia_server_path = "http://localhost:4001/ninja"


class ExitSchema(BaseModel):
    id: int
    name: str
    source_name: str
    source_id: int
    destination_name: str
    destination_id: int
    attributes: dict[str, str]


class RoomSchema(BaseModel):
    id: int
    attributes: dict[str, str]
    name: str
    tags: dict[str, str]  # This represents the Tags type
    exits: list[ExitSchema]


class RoomGraphSchema(BaseModel):
    rooms: dict[int, RoomSchema]
    exits: dict[int, ExitSchema]


class RoomNamesListEntry(BaseModel):
    id: int
    name: str


class RoomUpsertSchema(BaseModel):
    name: str
    description: str | None = None
    tags: dict[str, str] | None = None
    attributes: dict[str, str] | None = None


class RoomCreateSchema(RoomUpsertSchema):
    name: str


class ExitUpsertSchema(BaseModel):
    name: str
    description: str | None = None
    attributes: dict[str, str] | None = None


class ExitCreateSchema(ExitUpsertSchema):
    name: str
    source_id: int
    destination_id: int


app = FastAPI(
    title="Room Editor API",
    description="API for room editor application",
    version="1.0.0",
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, replace with specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    return {"message": "Welcome to Room Editor API"}


@app.get("/can-connect")
async def can_connect():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{evennia_server_path}/can-connect")
        response.raise_for_status()
        return response.json()


@app.get("/room_graph")
async def get_room_graph(start_room_id: int | None = None, depth: int | None = None):
    """
    Endpoint to retrieve the room graph from the Evennia server.

    Args:
        start_room_id (int, optional): The ID of the room to start the graph from
        depth (int, optional): How many rooms deep to traverse from the start room
    """

    params = {}
    if start_room_id is not None:
        params["start_room_id"] = start_room_id
    if depth is not None:
        params["depth"] = depth

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(
                f"{evennia_server_path}/room_graph", params=params
            )
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            return {"error": str(e)}, 500


@app.get("/rooms/names", response_model=list[RoomNamesListEntry])
async def get_rooms():
    async with httpx.AsyncClient() as client:
        response = await client.get(f"{evennia_server_path}/rooms/names")
        response.raise_for_status()
        return response.json()


@app.post("/room")
async def create_room(room: RoomCreateSchema):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{evennia_server_path}/room", json=room.model_dump()
        )
        response.raise_for_status()
        return response.json()


@app.post("/room/{room_id}")
async def update_room(room_id: int, room: RoomUpsertSchema):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{evennia_server_path}/room/{room_id}", json=room.model_dump()
        )
        response.raise_for_status()
        return response.json()


@app.delete("/room/{room_id}")
async def delete_room(room_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{evennia_server_path}/room/{room_id}")

        try:
            response.raise_for_status()
        except httpx.HTTPStatusError as e:
            return {
                "error": str(e),
                "status_code": e.response.status_code,
                "meta": "error with evennia server",
            }
        return response.json()


@app.post("/exit")
async def create_exit(exit_data: ExitCreateSchema):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{evennia_server_path}/exit", json=exit_data.model_dump()
        )
        response.raise_for_status()
        return response.json()


@app.put("/exit/{exit_id}")
async def update_exit(exit_id: int, exit_data: ExitUpsertSchema):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            f"{evennia_server_path}/exit/{exit_id}", json=exit_data.model_dump()
        )
        response.raise_for_status()
        return response.json()


@app.delete("/exit/{exit_id}")
async def delete_exit(exit_id: int):
    async with httpx.AsyncClient() as client:
        response = await client.delete(f"{evennia_server_path}/exit/{exit_id}")
        response.raise_for_status()
        return response.json()
