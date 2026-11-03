
import React from "react";
import {
    act,
    fireEvent,
    render,
    screen,
    waitFor,
} from "@testing-library/react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import CreateWorkspaceModal from "@/components/workspaces/CreateWorkspaceModal";
import { DEFAULT_THEME, themes } from "@/theme/themes";
import JoinWorkspaceModal from "@/components/workspaces/JoinWorkspaceModal";
import {
    createWorkspace,
    getWorkspaces,
    joinWorkspace,
    WorkspaceResponse,
    WorkspaceRole
} from "@/client/signalr/workspaceClient";
import {useAuth} from "@/context/AuthContext";
import WorkspacesScreen from "@/app/(dashboard)/workspaces/workspaces";
import {RefreshControl} from "react-native";
jest.mock("@expo/vector-icons", () => ({
    Ionicons: () => null,
}));

jest.mock("@/context/AuthContext", () => ({
    __esModule: true,
    useAuth: jest.fn(),
}));

jest.mock("@/client/signalr/workspaceClient", () => ({
    __esModule: true,

    WorkspaceRole: {
        Owner: "Owner",
        Admin: "Admin",
        Member: "Member",
        Viewer: "Viewer",
    },

    getWorkspaces: jest.fn(),
    createWorkspace: jest.fn(),
    joinWorkspace: jest.fn(),
}));

const colours = themes[DEFAULT_THEME];
const INVITE_CODE = "A".repeat(43);
const TEST_TOKEN = "test-jwt-token";
const INVITE_URL = `https://kanban-d6zv.onrender.com/join/${INVITE_CODE}`;

const mockUseAuth = useAuth as jest.Mock;
const mockGetWorkspaces = getWorkspaces as jest.MockedFunction<typeof getWorkspaces>;
const mockCreateWorkspace = createWorkspace as jest.MockedFunction<typeof createWorkspace>;
const mockJoinWorkspace = joinWorkspace as jest.MockedFunction<typeof joinWorkspace>;

const ownerWorkspace: WorkspaceResponse = {
    id: 10,
    name: "John Smith Development",
    role: WorkspaceRole.Owner,
    createdAt: "2026-10-20T12:00:00Z",
};

const memberWorkspace: WorkspaceResponse = {
    id: 20,
    name: "University Project",
    role: WorkspaceRole.Member,
    createdAt: "2026-10-21T12:00:00Z",
};

const adminWorkspace: WorkspaceResponse = {
    id: 30,
    name: "Design Team",
    role: WorkspaceRole.Admin,
    createdAt: "2026-10-22T12:00:00Z",
};

const viewerWorkspace: WorkspaceResponse = {
    id: 40,
    name: "Shared Documents",
    role: WorkspaceRole.Viewer,
    createdAt: "2026-10-23T12:00:00Z",
};

describe("WorkspaceTests", () => {

    describe("CreateWorkspaceModal", () => {
        const createProps = () => ({
            visible: true,
            isFirstWorkspace: true,
            colours,
            onClose: jest.fn(),
            onJoin: jest.fn(),
            onCreate: jest.fn<Promise<void>, [string]>()
                .mockResolvedValue(undefined),
        });

        beforeEach(() => {
            jest.clearAllMocks();

            mockUseAuth.mockReturnValue({
                token: "test-jwt-token",
                preferences: {
                    theme: DEFAULT_THEME,
                },
            });

            mockGetWorkspaces.mockImplementation(
                async () => [ownerWorkspace]
            );
        });

        it("shows the onboarding explanation for the first workspace", async () => {
            await render(<CreateWorkspaceModal {...createProps()} />);

            expect(
                screen.getByText("Your first workspace")
            ).toBeTruthy();

            expect(
                screen.getByText(/A workspace brings your projects/)
            ).toBeTruthy();

            expect(
                screen.getByTestId("create-modal-join-option")
            ).toBeTruthy();
        });

        it("shows the normal creation heading for existing users", async () => {
            await render(
                <CreateWorkspaceModal
                    {...createProps()}
                    isFirstWorkspace={false}
                />
            );

            expect(
                screen.getByText("Create a workspace")
            ).toBeTruthy();

            expect(
                screen.queryByTestId("create-modal-join-option")
            ).toBeNull();
        });

        it("disables creation when the name is empty", async () => {
            const props = createProps();

            await render(<CreateWorkspaceModal {...props} />);

            const submit = screen.getByTestId(
                "create-workspace-submit"
            );

            expect(submit).toBeDisabled();

            await fireEvent.press(submit);

            expect(props.onCreate).not.toHaveBeenCalled();
        });

        it("disables creation when the name contains only whitespace", async () => {
            const props = createProps();

            await render(<CreateWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "     "
            );

            expect(
                screen.getByTestId("create-workspace-submit")
            ).toBeDisabled();

            expect(props.onCreate).not.toHaveBeenCalled();
        });

        it("trims the name before creating a workspace", async () => {
            const props = createProps();

            await render(<CreateWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "   John Smith Development   "
            );

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            await waitFor(() => {
                expect(props.onCreate).toHaveBeenCalledTimes(1);
                expect(props.onCreate).toHaveBeenCalledWith(
                    "John Smith Development"
                );
            });
        });

        it("limits the workspace name to 100 characters", async () => {
            await render(<CreateWorkspaceModal {...createProps()} />);

            const input = screen.getByTestId("workspace-name-input");

            expect(input.props.maxLength).toBe(100);
        });

        it("updates the name counter and invitation preview", async () => {
            await render(<CreateWorkspaceModal {...createProps()} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "Development"
            );

            expect(
                screen.getByText("11/100 characters")
            ).toBeTruthy();

            expect(
                screen.getByText(/INVITE-CODE/)
            ).toBeTruthy();
        });

        it("shows a loading state while creation is pending", async () => {
            let resolveCreate!: () => void;

            const onCreate = jest.fn(
                () => new Promise<void>(resolve => {
                    resolveCreate = resolve;
                })
            );

            const props = {
                ...createProps(),
                onCreate,
            };

            await render(<CreateWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "Development"
            );

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            expect(
                screen.getByText("Creating...")
            ).toBeTruthy();

            expect(
                screen.getByTestId("create-workspace-submit")
            ).toBeDisabled();

            expect(
                screen.getByTestId("workspace-name-input")
            ).toBeDisabled();

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            expect(onCreate).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolveCreate();
            });

            expect(
                screen.getByTestId("create-workspace-submit")
            ).toBeEnabled();
        });

        it("displays an error when workspace creation fails", async () => {
            const props = createProps();

            props.onCreate.mockRejectedValueOnce(
                new Error("Workspace name is unavailable")
            );

            await render(<CreateWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "Development"
            );

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            expect(
                await screen.findByText("Workspace name is unavailable")
            ).toBeTruthy();

            expect(
                screen.getByTestId("create-workspace-submit")
            ).toBeEnabled();
        });

        it("allows retrying after a failed creation", async () => {
            const props = createProps();

            props.onCreate
                .mockRejectedValueOnce(new Error("Temporary error"))
                .mockResolvedValueOnce(undefined);

            await render(<CreateWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "Development"
            );

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            expect(
                await screen.findByText("Temporary error")
            ).toBeTruthy();

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            await waitFor(() => {
                expect(props.onCreate).toHaveBeenCalledTimes(2);
                expect(
                    screen.queryByText("Temporary error")
                ).toBeNull();
            });
        });

        it("calls onJoin when the first-workspace option is selected", async () => {
            const props = createProps();

            await render(<CreateWorkspaceModal {...props} />);

            await fireEvent.press(
                screen.getByTestId("create-modal-join-option")
            );

            expect(props.onJoin).toHaveBeenCalledTimes(1);
            expect(props.onCreate).not.toHaveBeenCalled();
        });

        it("calls onClose when the close button is pressed", async () => {
            const props = createProps();

            await render(<CreateWorkspaceModal {...props} />);

            await fireEvent.press(
                screen.getByLabelText("Close create workspace")
            );

            expect(props.onClose).toHaveBeenCalledTimes(1);
        });

        it("resets the name when the modal is reopened", async () => {
            const props = createProps();

            const { rerender } = await render(
                <CreateWorkspaceModal {...props} />
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "Previous Workspace"
            );

            await rerender(
                <CreateWorkspaceModal {...props} visible={false} />
            );

            await rerender(
                <CreateWorkspaceModal {...props} visible={true} />
            );

            expect(
                screen.getByTestId("workspace-name-input").props.value
            ).toBe("");
        });
    });

    describe("JoinWorkspaceModal", () => {
        const createProps = () => ({
            visible: true,
            colours,
            onClose: jest.fn(),
            onCreate: jest.fn(),
            onJoin: jest.fn<Promise<void>, [string]>()
                .mockResolvedValue(undefined),
        });

        beforeEach(() => {
            jest.clearAllMocks();
        });

        it("renders the invitation form", async () => {
            await render(<JoinWorkspaceModal {...createProps()} />);

            expect(
                screen.getByText("Join a workspace")
            ).toBeTruthy();

            expect(
                screen.getByTestId("workspace-invitation-input")
            ).toBeTruthy();

            expect(
                screen.getByTestId("join-workspace-submit")
            ).toBeTruthy();
        });

        it("disables joining when the input is empty", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            const submit = screen.getByTestId("join-workspace-submit");

            expect(submit).toBeDisabled();

            await fireEvent.press(submit);

            expect(props.onJoin).not.toHaveBeenCalled();
        });

        it("disables joining when input is only whitespace", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                "    "
            );

            expect(
                screen.getByTestId("join-workspace-submit")
            ).toBeDisabled();

            expect(props.onJoin).not.toHaveBeenCalled();
        });

        it("submits a valid raw invitation code", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            await waitFor(() => {
                expect(props.onJoin).toHaveBeenCalledTimes(1);
                expect(props.onJoin).toHaveBeenCalledWith(INVITE_CODE);
            });
        });

        it("extracts the code from a full invitation URL", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_URL
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            await waitFor(() => {
                expect(props.onJoin).toHaveBeenCalledWith(INVITE_CODE);
            });
        });

        it("trims surrounding whitespace from an invitation code", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                `  ${INVITE_CODE}  `
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            await waitFor(() => {
                expect(props.onJoin).toHaveBeenCalledWith(INVITE_CODE);
            });
        });

        it("rejects an invalid invitation code", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                "invalid-code"
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                await screen.findByText(
                    "Please enter a valid invitation code or invitation link."
                )
            ).toBeTruthy();

            expect(props.onJoin).not.toHaveBeenCalled();
        });

        it("rejects a URL without a valid invitation code", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                "https://kanban-d6zv.onrender.com/join/invalid"
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                await screen.findByText(
                    "Please enter a valid invitation code or invitation link."
                )
            ).toBeTruthy();

            expect(props.onJoin).not.toHaveBeenCalled();
        });

        it("clears validation errors when the input changes", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            const input = screen.getByTestId(
                "workspace-invitation-input"
            );

            await fireEvent.changeText(input, "invalid");

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                screen.getByText(
                    "Please enter a valid invitation code or invitation link."
                )
            ).toBeTruthy();

            await fireEvent.changeText(input, INVITE_CODE);

            expect(
                screen.queryByText(
                    "Please enter a valid invitation code or invitation link."
                )
            ).toBeNull();
        });

        it("shows a loading state while joining", async () => {
            let resolveJoin!: () => void;

            const onJoin = jest.fn(
                () => new Promise<void>(resolve => {
                    resolveJoin = resolve;
                })
            );

            const props = {
                ...createProps(),
                onJoin,
            };

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                screen.getByText("Joining workspace...")
            ).toBeTruthy();

            expect(
                screen.getByTestId("join-workspace-submit")
            ).toBeDisabled();

            expect(
                screen.getByTestId("workspace-invitation-input")
            ).toBeDisabled();

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(onJoin).toHaveBeenCalledTimes(1);

            await act(async () => {
                resolveJoin();
            });

            expect(
                screen.getByTestId("join-workspace-submit")
            ).toBeEnabled();
        });

        it("prevents closing and switching modals while joining", async () => {
            let resolveJoin!: () => void;

            const onJoin = jest.fn(
                () => new Promise<void>(resolve => {
                    resolveJoin = resolve;
                })
            );

            const props = {
                ...createProps(),
                onJoin,
            };

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            await fireEvent.press(
                screen.getByLabelText("Close join workspace")
            );

            await fireEvent.press(
                screen.getByTestId("join-modal-create-option")
            );

            expect(props.onClose).not.toHaveBeenCalled();
            expect(props.onCreate).not.toHaveBeenCalled();

            await act(async () => {
                resolveJoin();
            });
        });

        it("displays a backend error and preserves the code", async () => {
            const props = createProps();

            props.onJoin.mockRejectedValueOnce(
                new Error("Invitation is invalid or expired")
            );

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                await screen.findByText(
                    "Invitation is invalid or expired"
                )
            ).toBeTruthy();

            expect(
                screen.getByTestId("workspace-invitation-input").props.value
            ).toBe(INVITE_CODE);

            expect(
                screen.getByTestId("join-workspace-submit")
            ).toBeEnabled();
        });

        it("allows retrying after an unsuccessful join", async () => {
            const props = createProps();

            props.onJoin
                .mockRejectedValueOnce(new Error("Connection failed"))
                .mockResolvedValueOnce(undefined);

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                await screen.findByText("Connection failed")
            ).toBeTruthy();

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            await waitFor(() => {
                expect(props.onJoin).toHaveBeenCalledTimes(2);
                expect(screen.queryByText("Connection failed")).toBeNull();
            });
        });

        it("opens create workspace when the alternative is selected", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.press(
                screen.getByTestId("join-modal-create-option")
            );

            expect(props.onCreate).toHaveBeenCalledTimes(1);
            expect(props.onJoin).not.toHaveBeenCalled();
        });

        it("closes when the close button is pressed", async () => {
            const props = createProps();

            await render(<JoinWorkspaceModal {...props} />);

            await fireEvent.press(
                screen.getByLabelText("Close join workspace")
            );

            expect(props.onClose).toHaveBeenCalledTimes(1);
        });

        it("clears the invitation when reopened", async () => {
            const props = createProps();

            const { rerender } = await render(
                <JoinWorkspaceModal {...props} />
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await rerender(
                <JoinWorkspaceModal {...props} visible={false} />
            );

            await rerender(
                <JoinWorkspaceModal {...props} visible={true} />
            );

            expect(
                screen.getByTestId("workspace-invitation-input").props.value
            ).toBe("");
        });
    });

    describe("WorkspacesScreen", () => {
        beforeEach(() => {
            jest.resetAllMocks();

            mockUseAuth.mockReturnValue({
                token: TEST_TOKEN,
                preferences: {
                    theme: DEFAULT_THEME,
                },
            });

            mockGetWorkspaces.mockResolvedValue([ownerWorkspace]);
        });

        it("loads workspaces using the authenticated token", async () => {
            await render(<WorkspacesScreen />);

            expect(
                await screen.findByText("John Smith Development")
            ).toBeTruthy();

            expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
            expect(mockGetWorkspaces).toHaveBeenCalledWith(TEST_TOKEN);
        });

        it("shows a loading indicator until the request finishes", async () => {
            let resolveRequest!: (value: WorkspaceResponse[]) => void;

            mockGetWorkspaces.mockImplementationOnce(
                () => new Promise<WorkspaceResponse[]>(resolve => {
                    resolveRequest = resolve;
                })
            );

            await render(<WorkspacesScreen />);

            expect(
                screen.getByText("Loading workspaces...")
            ).toBeTruthy();

            expect(
                screen.queryByText("John Smith Development")
            ).toBeNull();

            await act(async () => {
                resolveRequest([ownerWorkspace]);
            });

            expect(
                screen.queryByText("Loading workspaces...")
            ).toBeNull();

            expect(
                screen.getByText("John Smith Development")
            ).toBeTruthy();
        });

        it("does not request workspaces without a token", async () => {
            mockUseAuth.mockReturnValue({
                token: null,
                preferences: {
                    theme: DEFAULT_THEME,
                },
            });

            await render(<WorkspacesScreen />);

            expect(
                await screen.findByText(
                    "Please sign in to view your workspaces."
                )
            ).toBeTruthy();

            expect(mockGetWorkspaces).not.toHaveBeenCalled();
            expect(mockCreateWorkspace).not.toHaveBeenCalled();
            expect(mockJoinWorkspace).not.toHaveBeenCalled();
        });

        it("displays an error when the initial load fails", async () => {
            mockGetWorkspaces.mockRejectedValueOnce(
                new Error("Unable to connect to the server")
            );

            await render(<WorkspacesScreen />);

            expect(
                await screen.findByText(
                    "Unable to connect to the server"
                )
            ).toBeTruthy();

            expect(
                screen.queryByText("Loading workspaces...")
            ).toBeNull();
        });

        it("opens the first-workspace modal when no workspaces exist", async () => {
            mockGetWorkspaces.mockResolvedValueOnce([]);

            await render(<WorkspacesScreen />);

            expect(
                await screen.findByText("Your first workspace")
            ).toBeTruthy();

            expect(
                screen.getByText("Your next project starts here")
            ).toBeTruthy();

            expect(
                screen.getByTestId("workspace-name-input")
            ).toBeTruthy();
        });

        it("does not open onboarding before the initial request completes", async () => {
            let resolveRequest!: (value: WorkspaceResponse[]) => void;

            mockGetWorkspaces.mockImplementationOnce(
                () => new Promise<WorkspaceResponse[]>(resolve => {
                    resolveRequest = resolve;
                })
            );

            await render(<WorkspacesScreen />);

            expect(
                screen.queryByText("Your first workspace")
            ).toBeNull();

            await act(async () => {
                resolveRequest([]);
            });

            expect(
                screen.getByText("Your first workspace")
            ).toBeTruthy();
        });

        it("allows switching from first-workspace creation to joining", async () => {
            mockGetWorkspaces.mockResolvedValueOnce([]);

            await render(<WorkspacesScreen />);

            await screen.findByText("Your first workspace");

            await fireEvent.press(
                screen.getByTestId("create-modal-join-option")
            );

            expect(
                screen.getByText("Join a workspace")
            ).toBeTruthy();

            expect(
                screen.getByTestId("workspace-invitation-input")
            ).toBeTruthy();

            expect(
                screen.queryByText("Your first workspace")
            ).toBeNull();
        });

        it("allows switching from joining back to creation", async () => {
            mockGetWorkspaces.mockResolvedValueOnce([]);

            await render(<WorkspacesScreen />);

            await screen.findByText("Your first workspace");

            await fireEvent.press(
                screen.getByTestId("create-modal-join-option")
            );

            await fireEvent.press(
                screen.getByTestId("join-modal-create-option")
            );

            expect(
                screen.getByText("Your first workspace")
            ).toBeTruthy();

            expect(
                screen.queryByTestId("workspace-invitation-input")
            ).toBeNull();
        });

        it("renders all workspaces returned by the client", async () => {
            mockGetWorkspaces.mockResolvedValueOnce([
                ownerWorkspace,
                memberWorkspace,
            ]);

            await render(<WorkspacesScreen />);

            expect(
                await screen.findByText("John Smith Development")
            ).toBeTruthy();

            expect(
                screen.getByText("University Project")
            ).toBeTruthy();

            expect(
                screen.getByText("2 workspaces")
            ).toBeTruthy();

            expect(
                screen.getByTestId("new-workspace-button")
            ).toBeTruthy();
        });

        it("does not show first-workspace onboarding when workspaces exist", async () => {
            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            expect(
                screen.queryByText("Your first workspace")
            ).toBeNull();

            expect(
                screen.getByText("All workspaces")
            ).toBeTruthy();
        });

        it("allows existing users to open the creation modal", async () => {
            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            await fireEvent.press(
                screen.getByTestId("new-workspace-button")
            );

            expect(
                screen.getByText("Create a workspace")
            ).toBeTruthy();

            expect(
                screen.queryByTestId("create-modal-join-option")
            ).toBeNull();
        });

        it("creates the first workspace and updates the grid", async () => {
            mockGetWorkspaces.mockResolvedValueOnce([]);

            const createdWorkspace: WorkspaceResponse = {
                id: 50,
                name: "John Smith Project",
                role: WorkspaceRole.Owner,
                createdAt: "2026-10-30T12:00:00Z",
            };

            mockCreateWorkspace.mockResolvedValueOnce(createdWorkspace);

            await render(<WorkspacesScreen />);

            await screen.findByText("Your first workspace");

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "John Smith Project"
            );

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            await waitFor(() => {
                expect(mockCreateWorkspace).toHaveBeenCalledWith(
                    TEST_TOKEN,
                    "John Smith Project"
                );
            });

            expect(
                await screen.findByText("John Smith Project")
            ).toBeTruthy();

            expect(
                screen.getByText("1 workspace")
            ).toBeTruthy();

            expect(
                screen.queryByText("Your first workspace")
            ).toBeNull();

            expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
        });

        it("creates an additional workspace from the grid", async () => {
            const createdWorkspace: WorkspaceResponse = {
                id: 60,
                name: "New Team",
                role: WorkspaceRole.Owner,
                createdAt: "2026-10-30T12:00:00Z",
            };

            mockCreateWorkspace.mockResolvedValueOnce(createdWorkspace);

            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            await fireEvent.press(
                screen.getByTestId("new-workspace-button")
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "New Team"
            );

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            await waitFor(() => {
                expect(mockCreateWorkspace).toHaveBeenCalledWith(
                    TEST_TOKEN,
                    "New Team"
                );
            });

            expect(
                await screen.findByText("New Team")
            ).toBeTruthy();

            expect(
                screen.getByText("John Smith Development")
            ).toBeTruthy();

            expect(
                screen.getByText("2 workspaces")
            ).toBeTruthy();
        });

        it("does not add a workspace when creation fails", async () => {
            mockCreateWorkspace.mockRejectedValueOnce(
                new Error("Unable to create workspace")
            );

            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            await fireEvent.press(
                screen.getByTestId("new-workspace-button")
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-name-input"),
                "Failed Workspace"
            );

            await fireEvent.press(
                screen.getByTestId("create-workspace-submit")
            );

            expect(
                await screen.findByText("Unable to create workspace")
            ).toBeTruthy();

            expect(
                screen.queryByText("Failed Workspace")
            ).toBeNull();

            expect(
                screen.getByText("1 workspace")
            ).toBeTruthy();

            // The modal remains open so the user can retry.
            expect(
                screen.getByTestId("workspace-name-input")
            ).toBeTruthy();
        });

        it("joins a workspace using the invitation code", async () => {
            mockJoinWorkspace.mockResolvedValueOnce(memberWorkspace);

            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            await fireEvent.press(
                screen.getByText("Join workspace")
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            await waitFor(() => {
                expect(mockJoinWorkspace).toHaveBeenCalledWith(
                    TEST_TOKEN,
                    INVITE_CODE
                );
            });

            expect(
                await screen.findByText("University Project")
            ).toBeTruthy();

            expect(
                screen.getByText("2 workspaces")
            ).toBeTruthy();

            expect(
                screen.queryByTestId("workspace-invitation-input")
            ).toBeNull();

            expect(mockGetWorkspaces).toHaveBeenCalledTimes(1);
        });

        it("joins the first workspace from the onboarding flow", async () => {
            mockGetWorkspaces.mockResolvedValueOnce([]);
            mockJoinWorkspace.mockResolvedValueOnce(memberWorkspace);

            await render(<WorkspacesScreen />);

            await screen.findByText("Your first workspace");

            await fireEvent.press(
                screen.getByTestId("create-modal-join-option")
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                await screen.findByText("University Project")
            ).toBeTruthy();

            expect(
                screen.getByText("1 workspace")
            ).toBeTruthy();

            expect(
                screen.queryByText("Your first workspace")
            ).toBeNull();

            expect(mockJoinWorkspace).toHaveBeenCalledWith(
                TEST_TOKEN,
                INVITE_CODE
            );
        });

        it("does not duplicate a workspace when the user already belongs to it", async () => {
            const existingMembership: WorkspaceResponse = {
                ...ownerWorkspace,
                name: "John Smith Development Updated",
            };

            mockJoinWorkspace.mockResolvedValueOnce(existingMembership);

            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            await fireEvent.press(
                screen.getByText("Join workspace")
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                await screen.findByText("John Smith Development Updated")
            ).toBeTruthy();

            expect(
                screen.getByText("1 workspace")
            ).toBeTruthy();

            expect(
                screen.queryByText("John Smith Development")
            ).toBeNull();
        });

        it("keeps the join modal open when the invitation fails", async () => {
            mockJoinWorkspace.mockRejectedValueOnce(
                new Error("Invitation is invalid or expired")
            );

            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            await fireEvent.press(
                screen.getByText("Join workspace")
            );

            await fireEvent.changeText(
                screen.getByTestId("workspace-invitation-input"),
                INVITE_CODE
            );

            await fireEvent.press(
                screen.getByTestId("join-workspace-submit")
            );

            expect(
                await screen.findByText(
                    "Invitation is invalid or expired"
                )
            ).toBeTruthy();

            expect(
                screen.getByTestId("workspace-invitation-input")
            ).toBeTruthy();

            expect(
                screen.getByText("1 workspace")
            ).toBeTruthy();

            expect(
                screen.queryByText("University Project")
            ).toBeNull();
        });

        it("shows Invite only for Owners and Admins", async () => {
            mockGetWorkspaces.mockResolvedValueOnce([
                ownerWorkspace,
                adminWorkspace,
                memberWorkspace,
                viewerWorkspace,
            ]);

            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            expect(
                screen.getByLabelText(
                    "Invite to John Smith Development"
                )
            ).toBeTruthy();

            expect(
                screen.getByLabelText("Invite to Design Team")
            ).toBeTruthy();

            expect(
                screen.queryByLabelText("Invite to University Project")
            ).toBeNull();

            expect(
                screen.queryByLabelText("Invite to Shared Documents")
            ).toBeNull();
        });

        it("opens the invitation modal for an Owner", async () => {
            await render(<WorkspacesScreen />);

            await screen.findByText("John Smith Development");

            await fireEvent.press(
                screen.getByLabelText(
                    "Invite to John Smith Development"
                )
            );

            expect(
                screen.getByText("Invite your team")
            ).toBeTruthy();

            expect(
                screen.getByText(/Shareable invitations for/)
            ).toBeTruthy();
        });

    });
})