from __future__ import annotations
from typing import Any


from evennia.objects.models import ObjectDB
from evennia.utils.dbserialize import _SaverDict
from loguru import logger
from ninja import NinjaAPI, Schema
from ninja.errors import HttpError
from pydantic import ConfigDict, field_serializer

from typeclasses.exits import Exit, DefaultExit
from typeclasses.rooms import Room

api = NinjaAPI()

Attributes = dict[str, str | int | float | bool | _SaverDict | dict]


class BaseSchema(Schema):
    @field_serializer("attributes", check_fields=False)
    def serialize_attributes(self, attributes: Attributes) -> Attributes:
        result = {}
        for key, value in attributes.items():
            if isinstance(value, _SaverDict):
                # Custom serialization for SaverDict
                result[key] = self.serialize_saver_dict(value)
            else:
                # Other types are already serializable
                result[key] = value
        return result

    def serialize_saver_dict(self, saver_dict: _SaverDict) -> dict[str, Any]:
        # Implement your custom SaverDict serialization logic here
        # This is just an example:
        return {
            "__type__": "_SaverDict",
            "data": dict(saver_dict),  # Or any other format you prefer
        }


class RoomSchema(BaseSchema):
    id: int
    attributes: Attributes
    name: str
    tags: Tags
    exits: list[ExitSchema]
    model_config = ConfigDict(arbitrary_types_allowed=True)

    @classmethod
    def from_room(cls, room: Room) -> RoomSchema:
        return cls(
            id=dbref_to_id(room.dbref),
            attributes=build_attributes(room),
            name=room.key,
            tags=build_tags(room),
            exits=build_exits(room),
        )


class RoomNamesListEntry(BaseSchema):
    id: int
    name: str


def get_room_names() -> list[RoomNamesListEntry]:
    try:
        rooms = Room.objects.all()
    except Exception as e:
        logger.error(f"Error getting rooms: {e}")
        raise e
    return [
        RoomNamesListEntry(id=dbref_to_id(room.dbref), name=room.key) for room in rooms
    ]


@api.get("/rooms/names", response=list[RoomNamesListEntry])
def get_rooms(request):
    try:
        return get_room_names()
    except Exception as e:
        logger.error(f"Error getting rooms: {e}")
        raise HttpError(status_code=500, message="Error getting rooms")


def build_attributes(obj: ObjectDB) -> Attributes:
    """
    Build a dictionary of attributes for an object.
    """
    logger.info(f"Building attributes for {obj.key}")
    attributes = {}
    for attr in obj.attributes.all():
        attributes[attr.key] = attr.value
    return attributes


Tags = dict[str, str]


def build_tags(obj: ObjectDB) -> Tags:
    """
    Build a dictionary of tags for an object.
    """
    logger.info(f"Building tags for {obj.key}")
    tags = {}
    for tag in obj.tags.all():
        tags[tag.key] = tag.value
    return tags


class ExitSchema(BaseSchema):
    id: int
    name: str
    source_name: str
    source_id: int
    destination_name: str
    destination_id: int
    attributes: Attributes
    model_config = ConfigDict(arbitrary_types_allowed=True)

    @classmethod
    def from_exit(cls, exit: Exit | DefaultExit) -> ExitSchema:
        return cls(
            id=exit.id,
            name=exit.key,
            source_name=exit.location.key,
            source_id=exit.location.id,
            destination_name=exit.destination.key,
            destination_id=exit.destination.id,
            attributes=build_attributes(exit),
        )


def build_exits(room: Room) -> list[ExitSchema]:
    """
    Build a list of exits for a room.
    """
    logger.info(f"Building exits for {room.key}")
    exits = []
    try:
        for exit in room.exits:
            logger.info(f"Exit: {exit.key}")
            exits.append(
                ExitSchema(
                    id=exit.id,
                    name=exit.key,
                    source_name=room.key,
                    source_id=room.id,
                    destination_name=exit.destination.key,
                    destination_id=exit.destination.id,
                    attributes=build_attributes(exit),
                )
            )
    except Exception as e:
        logger.error(f"Error building exits for {room.key}: {e}")
    return exits


def dbref_to_id(dbref: str) -> int:
    """
    Convert a dbref to an id.
    """
    return int(dbref.split("#")[1])


def get_room_by_id(room_id: int) -> RoomSchema:
    """
    Get a room by id.
    """
    try:
        room = ObjectDB.objects.get(id=room_id)
    except Exception as e:
        logger.error(f"Error getting room {room_id}: {e}")
        raise HttpError(status_code=500, message="Error getting room")

    try:
        return RoomSchema(
            id=dbref_to_id(room.dbref),
            attributes=build_attributes(room),
            name=room.key,
            tags=build_tags(room),
            exits=build_exits(room),
        )
    except Exception as e:
        logger.error(f"Error building room {room.key}: {e}")
        raise e


@api.get("/room/{room_id}", response=RoomSchema)
def get_room(request, room_id: int):
    try:
        return get_room_by_id(room_id)
    except Exception as e:
        logger.error(f"Error getting room {room_id}: {e}")
        raise HttpError(status_code=500, message="Error getting room")


class RoomGraphSchema(BaseSchema):
    rooms: dict[int, RoomSchema]
    exits: dict[int, ExitSchema]


def get_room_graph_by_id(start_room_id: int, depth: int = 1) -> RoomGraphSchema:
    """
    Recursively get a room graph by id. This will return dictionaries of rooms and exits.
    """
    rooms = {}
    exits = {}
    start_room = get_room_by_id(start_room_id)

    # Add the start room to the rooms dictionary
    room_data = start_room.model_dump()
    rooms[start_room.id] = room_data

    # Add the exits from the start room to the exits dictionary
    for exit in start_room.exits:
        exits[exit.id] = exit

    if depth > 0:
        for exit in start_room.exits:
            # Check if we've already visited the destination room
            if exit.destination_id not in rooms:
                recursive_graph = get_room_graph_by_id(exit.destination_id, depth - 1)
                # Merge the recursive rooms and exits into our current dictionaries
                rooms.update(recursive_graph.rooms)
                exits.update(recursive_graph.exits)

    return RoomGraphSchema(rooms=rooms, exits=exits)


@api.get("/room_graph")
def get_room_graph(request, start_room_id: int, depth: int = 1):
    try:
        return get_room_graph_by_id(start_room_id, depth)
    except Exception as e:
        print(f"Error getting room graph: {e}")
        raise HttpError(status_code=500, message="Error getting room graph")


class RoomUpsertSchema(BaseSchema):
    name: str
    desc: str | None = None
    description: str | None = None
    tags: Tags | None = None
    attributes: Attributes | None = None
    model_config = ConfigDict(arbitrary_types_allowed=True)


class RoomCreateSchema(RoomUpsertSchema):
    name: str


@api.post("/room/{room_id}")
def upsert_room(request, room_id: int, room_upsert: RoomUpsertSchema):
    print(f"Upserting room {room_id}")
    try:
        room = Room.objects.get(id=room_id)
    except Exception as e:
        print(f"Error getting room {room_id}: {e}")
        return "Error getting room"
    try:
        print(f"Upserting room {room_id}")
        room.key = room_upsert.name

        if room_upsert.description is not None:
            room.attributes.add("desc", room_upsert.description)

        if room_upsert.attributes is not None:
            for key, value in room_upsert.attributes.items():
                room.attributes.add(key, value)

        if room_upsert.tags is not None:
            for key, value in room_upsert.tags.items():
                room.attributes.add(key, value)

        room.save()
    except Exception as e:
        print(f"Error upserting room {room_id}: {e}")
        return "Error upserting room"
    print(f"Upserted room {room_id}")
    return RoomSchema.from_room(room)


@api.post("/room")
def create_room(request, room_create: RoomCreateSchema) -> RoomSchema:
    try:
        description = room_create.desc
        if description is None and room_create.description is not None:
            description = room_create.description

        created_room, errors = Room.create(
            key=room_create.name,
            description=description,
        )
        if room_create.attributes is not None:
            for key, value in room_create.attributes.items():
                created_room.attributes.add(key, value)

        if errors:
            logger.error(f"Error creating room {room_create.name}: {errors}")
            raise HttpError(status_code=500, message="Error creating room")

        if created_room is None:
            logger.error(f"Error creating room {room_create.name}: {errors}")
            raise HttpError(status_code=500, message="Error creating room")

        return RoomSchema.from_room(created_room)
    except Exception as e:
        print(f"Error creating room {room_create.name}: {e}")
        raise HttpError(status_code=500, message="Error creating room")


class ExitCreateSchema(Schema):
    name: str
    source_id: int
    destination_id: int


@api.post("/exit")
def create_exit(request, exit_create: ExitCreateSchema) -> ExitSchema:
    try:
        source = Room.objects.get(id=exit_create.source_id)
        destination = Room.objects.get(id=exit_create.destination_id)
        exit, errors = Exit.create(
            key=exit_create.name,
            location=source,
            destination=destination,
        )
        if errors:
            print(f"Error creating exit {exit_create.name}: {errors}")
            raise HttpError(status_code=500, message="Error creating exit")

        if exit is None:
            logger.error(f"Error creating exit {exit_create.name}: {errors}")
            raise HttpError(status_code=500, message="Error creating exit")

        return ExitSchema.from_exit(exit)
    except Exception as e:
        print(f"Error creating exit {exit_create.name}: {e}")
        raise {"error": str(e), "status_code": 500, "meta": "error with evennia server"}
