import {HubConnection, HubConnectionBuilder, LogLevel} from "@microsoft/signalr";

const BASE_URL = `${process.env.API_URL}/boardhub`

let connection: HubConnection | null = null;

export const getConnection = async (token: string): Promise<HubConnection> => {
    if(!connection){
        connection = new HubConnectionBuilder()
            .withUrl(BASE_URL, {
                accessTokenFactory: () => token
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();
    }

    if(connection.state === "Disconnected"){
        await connection.start();
    }
    return connection;
}