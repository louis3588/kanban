import {HubConnection, HubConnectionBuilder, LogLevel} from "@microsoft/signalr";

const BASE_URL = `https://localhost:7293/hubs/board`

let connection: HubConnection | null = null;

export const getConnection = async (token: string): Promise<HubConnection> => {
    if(!connection){
        connection = new HubConnectionBuilder()
            .withUrl(BASE_URL, {
                accessTokenFactory: () => token,
            }).withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();
    }

    if(connection.state === "Disconnected"){
        await connection.start().catch((err) => {throw new Error(err.message);});
    }
    return connection;
}