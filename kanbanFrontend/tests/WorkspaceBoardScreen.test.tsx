import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useAuth } from '@/context/AuthContext';
import WorkspaceBoardsScreen from '../src/app/(dashboard)/workspaces/[workspaceId]';
import {
    WorkspaceRole,
    getWorkspace,
    updateWorkspaceName,
    deleteWorkspace,
    createWorkspaceInvitation,
    revokeWorkspaceInvitation,
    updateWorkspaceMemberRole,
    removeWorkspaceMember,
    transferWorkspaceOwnership,
    type WorkspaceBoardResponse,
    type CreatedWorkspaceInvitation,
} from '@/client/signalr/workspaceClient';


jest.mock('@/client/signalr/workspaceClient', () => ({
    WorkspaceRole: {
        Owner: 'Owner',
        Admin: 'Admin',
        Member: 'Member',
        Viewer: 'Viewer',
    },
    getWorkspace: jest.fn(),
    updateWorkspaceName: jest.fn(),
    deleteWorkspace: jest.fn(),
    createWorkspaceInvitation: jest.fn(),
    revokeWorkspaceInvitation: jest.fn(),
    updateWorkspaceMemberRole: jest.fn(),
    removeWorkspaceMember: jest.fn(),
    transferWorkspaceOwnership: jest.fn(),
}));

jest.mock('@/context/AuthContext', () => ({
    useAuth: jest.fn(),
}));

jest.mock('expo-router', () => ({
    router: { push: jest.fn(), replace: jest.fn() },
    useLocalSearchParams: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => ({
    Ionicons: () => null,
}));

const mockUseAuth = useAuth as jest.Mock;
const mockUseParams = useLocalSearchParams as jest.Mock;
const api = {
    getWorkspace: jest.mocked(getWorkspace),
    updateWorkspaceName: jest.mocked(updateWorkspaceName),
    deleteWorkspace: jest.mocked(deleteWorkspace),
    createWorkspaceInvitation: jest.mocked(createWorkspaceInvitation),
    revokeWorkspaceInvitation: jest.mocked(revokeWorkspaceInvitation),
    updateWorkspaceMemberRole: jest.mocked(updateWorkspaceMemberRole),
    removeWorkspaceMember: jest.mocked(removeWorkspaceMember),
    transferWorkspaceOwnership: jest.mocked(transferWorkspaceOwnership),
};

const ownerPermissions = {
    canEditTasks: true,
    canManageBoards: true,
    canManageMembers: true,
    canManageAdmins: true,
    canManageInvitations: true,
    canEditWorkspace: true,
    canTransferOwnership: true,
};

const invitation = {
    id: 7,
    workspaceId: 1,
    createdByUserId: 1,
    createdAtUtc: '2026-11-01T10:00:00.000Z',
    expiresAtUtc: '2099-01-01T00:00:00.000Z',
    redeemedCount: 2,
    maxUses: 10,
};

const makeWorkspace = (
    overrides: Partial<WorkspaceBoardResponse> = {},
): WorkspaceBoardResponse => ({
    workspaceId: 1,
    name: 'Engineering',
    createdAt: '2026-11-01T10:00:00.000Z',
    imageUrl: null,
    role: WorkspaceRole.Owner,

    boards: [
        { boardId: 12, name: 'Sprint Planning', imageUrl: null, position: 2 },
        { boardId: 11, name: 'Roadmap', imageUrl: null, position: 1 },
    ],
    members: [
        {
            workspaceId: 1,
            user: {
                userId: 1,
                firstname: 'John',
                lastname: 'Smith',
                username: 'johnsmith'
            },
            role: WorkspaceRole.Owner,
            joinedAt: '2026-11-01T10:00:00.000Z',
        },
        {
            workspaceId: 1,
            user: {
                userId: 2,
                firstname: 'Jane',
                lastname: 'Doe',
                username: 'janedoe',
            },
            role: WorkspaceRole.Member,
            joinedAt: '2026-11-02T10:00:00.000Z',
        },
    ],
    invitations: [invitation],
    permissions: { ...ownerPermissions },
    ...overrides,
});

const createdInvitation: CreatedWorkspaceInvitation = {
    ...invitation,
    id: 8,
    redeemedCount: 0,
    code: 'invite-code-123',
    inviteUrl: 'https://kanban.example/join/invite-code-123',
};

async function renderLoaded(workspace = makeWorkspace()) {
    api.getWorkspace.mockResolvedValue(workspace);
    await render(<WorkspaceBoardsScreen />);
    await screen.findByText(workspace.name);
}

async function openMemberActions(username = 'janedoe') {
    await fireEvent.press(screen.getByLabelText(`Manage ${username}`));
}

async function confirmAction() {
    await fireEvent.press(screen.getByTestId('confirmation-accept'));
}

async function cancelAction() {
    await fireEvent.press(screen.getByTestId('confirmation-cancel'));
}

describe('WorkspaceBoardsScreen', () => {
    let logSpy: jest.SpyInstance;

    beforeAll(() => {
        logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterAll(() => {
        logSpy.mockRestore();
    });

    beforeEach(() => {
        jest.clearAllMocks();
        api.getWorkspace.mockReset();

        mockUseParams.mockReturnValue({ workspaceId: '1' });
        mockUseAuth.mockReturnValue({
            token: 'test-jwt',
            user: { id: 1, username: 'johnsmith' },
            preferences: null,
        });
        api.getWorkspace.mockResolvedValue(makeWorkspace());
        api.updateWorkspaceName.mockResolvedValue({
            id: 1,
            name: 'Engineering',
            role: WorkspaceRole.Owner,
            createdAt: '2026-11-01T10:00:00.000Z',
        });
        api.deleteWorkspace.mockResolvedValue(true);
        api.createWorkspaceInvitation.mockResolvedValue(createdInvitation);
        api.revokeWorkspaceInvitation.mockResolvedValue(true);
        api.updateWorkspaceMemberRole.mockResolvedValue(undefined);
        api.removeWorkspaceMember.mockResolvedValue(undefined);
        api.transferWorkspaceOwnership.mockResolvedValue(undefined);
    });

    describe('loading and navigation', () => {
        it('shows a loading state while the workspace request is pending', async () => {
            let finishRequest!: (value: WorkspaceBoardResponse) => void;
            api.getWorkspace.mockImplementationOnce(
                () => new Promise(resolve => { finishRequest = resolve; }),
            );

            await render(<WorkspaceBoardsScreen />);
            expect(screen.getByText('Loading workspace...')).toBeTruthy();
            expect(api.getWorkspace).toHaveBeenCalledWith('test-jwt', 1);

            await act(async () => finishRequest(makeWorkspace()));
            expect(screen.getByText('Engineering')).toBeTruthy();
        });

        it('does not contact SignalR when signed out', async () => {
            mockUseAuth.mockReturnValue({ token: null, user: null, preferences: null });
            await render(<WorkspaceBoardsScreen />);

            expect(await screen.findByText('Please sign in to view this workspace.')).toBeTruthy();
            expect(api.getWorkspace).not.toHaveBeenCalled();
        });

        it('does not contact SignalR with an invalid workspace ID', async () => {
            mockUseParams.mockReturnValue({ workspaceId: 'not-a-number' });
            await render(<WorkspaceBoardsScreen />);

            expect(await screen.findByText('Invalid workspace ID.')).toBeTruthy();
            expect(api.getWorkspace).not.toHaveBeenCalled();
        });

        it('shows an unavailable screen when loading fails', async () => {
            api.getWorkspace.mockRejectedValueOnce(new Error('Workspace not found'));
            await render(<WorkspaceBoardsScreen />);

            expect(await screen.findByText('Workspace unavailable')).toBeTruthy();
            expect(screen.getByText('Workspace not found')).toBeTruthy();
            await fireEvent.press(screen.getByText('Back to workspaces'));
            expect(router.replace).toHaveBeenCalledWith('/workspaces');
        });

        it('renders workspace details, member usernames and invitations', async () => {
            await renderLoaded();

            expect(api.getWorkspace).toHaveBeenCalledWith('test-jwt', 1);
            expect(screen.getByText('Your role: Owner')).toBeTruthy();
            expect(screen.getByText('John Smith')).toBeTruthy();
            expect(screen.getByText('Jane Doe')).toBeTruthy();
            expect(screen.getByText('@janedoe · Member')).toBeTruthy();
            expect(screen.getByText('Roadmap')).toBeTruthy();
            expect(screen.getByText('Sprint Planning')).toBeTruthy();
            expect(screen.getByText('Invitation #7')).toBeTruthy();
        });

        it('sorts boards by position and navigates to the selected board', async () => {
            await renderLoaded();

            const cards = screen.getAllByTestId(/^board-card-/);
            expect(cards.map(card => card.props.testID)).toEqual([
                'board-card-11',
                'board-card-12',
            ]);

            await fireEvent.press(screen.getByTestId('board-card-11'));
            expect(router.push).toHaveBeenCalledWith({
                pathname: '/boards/[boardId]',
                params: { boardId: '11' },
            });
        });

        it('navigates back to the workspace list', async () => {
            await renderLoaded();
            await fireEvent.press(screen.getByText('Your workspaces'));
            expect(router.push).toHaveBeenCalledWith('/workspaces');
        });

        it('shows the empty state when there are no boards', async () => {
            await renderLoaded(makeWorkspace({ boards: [] }));
            expect(screen.getByText('No boards yet')).toBeTruthy();
            expect(screen.getByText('This workspace is ready for its first board.')).toBeTruthy();
        });

        it('refreshes workspace data when the user pulls to refresh', async () => {
            const initial = makeWorkspace();
            const updated = makeWorkspace({
                name: 'Engineering Updated',
            });

            api.getWorkspace
                .mockReset()
                .mockResolvedValueOnce(initial)
                .mockResolvedValueOnce(updated);

            await renderLoaded(initial);

            const scrollView = screen.getByTestId('workspace-scroll');

            await act(async () => {
                scrollView.props.refreshControl.props.onRefresh();
            });

            await waitFor(() => {
                expect(api.getWorkspace).toHaveBeenCalledTimes(2);
                expect(screen.getByText('Engineering Updated')).toBeTruthy();
            });
        });

        it('does not offer member management actions for the current user', async () => {
            await renderLoaded();
            expect(screen.queryByLabelText('Manage johnsmith')).toBeNull();
            expect(screen.getByLabelText('Manage janedoe')).toBeTruthy();
        });

        it('hides owner and invitation controls for viewers', async () => {
            const viewerPermissions: WorkspaceBoardResponse['permissions'] = {
                canEditTasks: false,
                canManageBoards: false,
                canManageMembers: false,
                canManageAdmins: false,
                canManageInvitations: false,
                canEditWorkspace: false,
                canTransferOwnership: false,
            };
            await renderLoaded(makeWorkspace({
                role: WorkspaceRole.Viewer,
                permissions: viewerPermissions,
                boards: [],
            }));

            expect(screen.getByText('An administrator can add boards to this workspace.')).toBeTruthy();
            expect(screen.queryByTestId('rename-workspace')).toBeNull();
            expect(screen.queryByTestId('delete-workspace')).toBeNull();
            expect(screen.queryByTestId('create-invitation')).toBeNull();
            expect(screen.queryByLabelText('Manage janedoe')).toBeNull();
        });
    });

    describe('renaming and deleting workspaces', () => {
        it('validates blank workspace names without calling the API', async () => {
            await renderLoaded();
            await fireEvent.press(screen.getByTestId('rename-workspace'));
            await fireEvent.changeText(screen.getByTestId('workspace-name-edit'), '   ');
            await fireEvent(screen.getByTestId('workspace-name-edit'), 'submitEditing');

            expect(await screen.findByText('Workspace name must be between 1 and 100 characters.')).toBeTruthy();
            expect(api.updateWorkspaceName).not.toHaveBeenCalled();
        });

        it('does nothing when the new name matches the original name', async () => {
            await renderLoaded();
            await fireEvent.press(screen.getByTestId('rename-workspace'));
            await fireEvent(screen.getByTestId('workspace-name-edit'), 'submitEditing');

            expect(screen.queryByText('Rename workspace?')).toBeNull();
            expect(api.updateWorkspaceName).not.toHaveBeenCalled();
        });

        it('does not rename until the user confirms', async () => {
            const original = makeWorkspace();
            const renamed = makeWorkspace({ name: 'Product Engineering' });
            api.getWorkspace.mockReset()
                .mockResolvedValueOnce(original)
                .mockResolvedValueOnce(renamed);
            await renderLoaded(original);

            await fireEvent.press(screen.getByTestId('rename-workspace'));
            await fireEvent.changeText(screen.getByTestId('workspace-name-edit'), ' Product Engineering ');
            await fireEvent(screen.getByTestId('workspace-name-edit'), 'submitEditing');

            expect(screen.getByText('Rename workspace?')).toBeTruthy();
            expect(api.updateWorkspaceName).not.toHaveBeenCalled();
            await confirmAction();

            await waitFor(() => {
                expect(api.updateWorkspaceName).toHaveBeenCalledWith('test-jwt', 1, 'Product Engineering');
                expect(api.getWorkspace).toHaveBeenCalledTimes(2);
                expect(screen.getByText('Workspace name updated.')).toBeTruthy();
                expect(screen.getByText('Product Engineering')).toBeTruthy();
            });
        });

        it('cancels a rename and restores the previous draft', async () => {
            await renderLoaded();
            await fireEvent.press(screen.getByTestId('rename-workspace'));
            await fireEvent.changeText(screen.getByTestId('workspace-name-edit'), 'New name');
            await fireEvent(screen.getByTestId('workspace-name-edit'), 'submitEditing');
            await cancelAction();

            expect(api.updateWorkspaceName).not.toHaveBeenCalled();
            await fireEvent.press(screen.getByTestId('rename-workspace'));
            expect(screen.getByTestId('workspace-name-edit').props.value).toBe('Engineering');
        });

        it('requires confirmation before deleting the workspace', async () => {
            await renderLoaded();
            await fireEvent.press(screen.getByTestId('delete-workspace'));
            expect(screen.getByText('Delete workspace?')).toBeTruthy();
            expect(api.deleteWorkspace).not.toHaveBeenCalled();
            await cancelAction();
            expect(api.deleteWorkspace).not.toHaveBeenCalled();

            await fireEvent.press(screen.getByTestId('delete-workspace'));
            await confirmAction();
            await waitFor(() => {
                expect(api.deleteWorkspace).toHaveBeenCalledWith('test-jwt', 1);
                expect(router.replace).toHaveBeenCalledWith('/workspaces');
            });
        });
    });

    describe('invitations', () => {
        it('creates a seven-day invitation and displays the new link', async () => {
            await renderLoaded();
            await fireEvent.press(screen.getByTestId('create-invitation'));

            await waitFor(() => {
                expect(api.createWorkspaceInvitation).toHaveBeenCalledWith('test-jwt', {
                    workspaceId: 1,
                    validForDays: 7,
                });
                expect(api.getWorkspace).toHaveBeenCalledTimes(2);
                expect(screen.getByText('Invitation created.')).toBeTruthy();
            });
            expect(screen.getByTestId('created-invitation-url').props.value)
                .toBe(createdInvitation.inviteUrl);
        });

        it('shows an error if invitation creation fails', async () => {
            api.createWorkspaceInvitation.mockRejectedValueOnce(new Error('Invitation failed'));
            await renderLoaded();
            await fireEvent.press(screen.getByTestId('create-invitation'));

            expect(await screen.findByText('Invitation failed')).toBeTruthy();
            expect(api.getWorkspace).toHaveBeenCalledTimes(1);
        });

        it('requires confirmation before revoking an invitation', async () => {
            await renderLoaded();
            await fireEvent.press(screen.getByLabelText('Revoke invitation 7'));
            expect(screen.getByText('Revoke invitation?')).toBeTruthy();
            expect(api.revokeWorkspaceInvitation).not.toHaveBeenCalled();

            await confirmAction();
            await waitFor(() => {
                expect(api.revokeWorkspaceInvitation).toHaveBeenCalledWith('test-jwt', 1, 7);
                expect(screen.getByText('Invitation revoked.')).toBeTruthy();
            });
        });

        it('does not offer revoke buttons for expired, revoked or exhausted invitations', async () => {
            await renderLoaded(makeWorkspace({
                invitations: [
                    { ...invitation, id: 8, expiresAtUtc: '2020-01-01T00:00:00.000Z' },
                    { ...invitation, id: 9, revokedAtUtc: '2026-11-03T00:00:00.000Z' },
                    { ...invitation, id: 10, maxUses: 2, redeemedCount: 2 },
                ],
            }));

            expect(screen.getByText(/Expired/)).toBeTruthy();
            expect(screen.getByText(/Revoked/)).toBeTruthy();
            expect(screen.getByText(/Usage limit reached/)).toBeTruthy();
            expect(screen.queryByLabelText('Revoke invitation 8')).toBeNull();
            expect(screen.queryByLabelText('Revoke invitation 9')).toBeNull();
            expect(screen.queryByLabelText('Revoke invitation 10')).toBeNull();
        });
    });

    describe('members and confirmation modal', () => {
        it('changes another member role only after confirmation', async () => {
            await renderLoaded();
            await openMemberActions();
            await fireEvent.press(screen.getByText('Change to Admin'));

            expect(screen.getByText('Change member role?')).toBeTruthy();
            expect(api.updateWorkspaceMemberRole).not.toHaveBeenCalled();
            await confirmAction();

            await waitFor(() => {
                expect(api.updateWorkspaceMemberRole).toHaveBeenCalledWith(
                    'test-jwt', 1, 2, WorkspaceRole.Admin,
                );
                expect(screen.getByText('Member role updated.')).toBeTruthy();
            });
        });

        it('allows cancelling member removal', async () => {
            await renderLoaded();
            await openMemberActions();
            await fireEvent.press(screen.getByText('Remove from workspace'));
            expect(screen.getByText('Remove workspace member?')).toBeTruthy();
            await cancelAction();
            expect(api.removeWorkspaceMember).not.toHaveBeenCalled();
        });

        it('removes another member after confirmation', async () => {
            await renderLoaded();
            await openMemberActions();
            await fireEvent.press(screen.getByText('Remove from workspace'));
            await confirmAction();

            await waitFor(() => {
                expect(api.removeWorkspaceMember).toHaveBeenCalledWith('test-jwt', 1, 2);
                expect(screen.getByText('Member removed.')).toBeTruthy();
            });
        });

        it('transfers ownership after confirmation', async () => {
            await renderLoaded();
            await openMemberActions();
            await fireEvent.press(screen.getByText('Transfer ownership'));
            expect(screen.getByText('Transfer workspace ownership?')).toBeTruthy();
            expect(api.transferWorkspaceOwnership).not.toHaveBeenCalled();
            await confirmAction();

            await waitFor(() => {
                expect(api.transferWorkspaceOwnership).toHaveBeenCalledWith('test-jwt', 1, 2);
                expect(screen.getByText('Ownership transferred.')).toBeTruthy();
            });
        });

        it('does not offer ownership transfer to an administrator', async () => {
            const permissions = { ...ownerPermissions, canTransferOwnership: false };
            await renderLoaded(makeWorkspace({ role: WorkspaceRole.Admin, permissions }));
            await openMemberActions();

            expect(screen.getByText('Change to Viewer')).toBeTruthy();
            expect(screen.queryByText('Transfer ownership')).toBeNull();
            expect(screen.queryByText('Change to Admin')).toBeNull();
        });

        it('keeps the confirmation modal open and displays a mutation error', async () => {
            api.updateWorkspaceMemberRole.mockRejectedValueOnce(new Error('Permission denied'));
            await renderLoaded();
            await openMemberActions();
            await fireEvent.press(screen.getByText('Change to Admin'));
            await confirmAction();

            expect(await screen.findByText('Permission denied')).toBeTruthy();
            expect(screen.getByText('Change member role?')).toBeTruthy();
            expect(api.getWorkspace).toHaveBeenCalledTimes(1);
        });

        it('shows a refresh warning if the mutation succeeds but reloading fails', async () => {
            const original = makeWorkspace();
            api.getWorkspace.mockReset()
                .mockResolvedValueOnce(original)
                .mockRejectedValueOnce(new Error('Refresh failed'));
            await renderLoaded(original);

            await openMemberActions();
            await fireEvent.press(screen.getByText('Change to Admin'));
            await confirmAction();

            await waitFor(() => {
                expect(api.updateWorkspaceMemberRole).toHaveBeenCalledTimes(1);
                expect(screen.getByText(
                    'The change was submitted, but the workspace could not be refreshed.',
                )).toBeTruthy();
            });
        });
    });
});
