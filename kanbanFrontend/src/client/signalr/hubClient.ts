import {HubConnection, HubConnectionBuilder, HubConnectionState, LogLevel} from "@microsoft/signalr";

const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL ?? "https://localhost:7293";
const HUB_URL = `${API_BASE_URL}/hubs/board`;

let connection: HubConnection | null = null;
let connectionToken: string | null = null;
let startPromise: Promise<void> | null = null;

export const getConnection = async (
    token: string,
): Promise<HubConnection> => {
    if (connection && connectionToken !== token) {
        await stopConnection();
    }

    if (!connection) {
        connectionToken = token;

        connection = new HubConnectionBuilder()
            .withUrl(HUB_URL, {
                accessTokenFactory: () => connectionToken ?? "",
            })
            .withAutomaticReconnect()
            .configureLogging(LogLevel.Warning)
            .build();
    }

    if (connection.state === HubConnectionState.Disconnected) {
        if (!startPromise) {
            const currentConnection = connection;

            startPromise = currentConnection.start().finally(() => {
                startPromise = null;
            });
        }

        await startPromise;
    } else if (connection.state === HubConnectionState.Connecting && startPromise) {
        await startPromise;
    }

    if (!connection) {
        throw new Error("The SignalR connection could not be established.");
    }

    return connection;
};

export const stopConnection = async (): Promise<void> => {
    const currentConnection = connection;
    connection = null;
    connectionToken = null;

    if (currentConnection) {
        await currentConnection.stop();
    }

    startPromise = null;
};