
import {fireEvent, render, screen, waitFor} from "@testing-library/react-native";
import { useAuth } from "@/context/AuthContext";
import ProfileScreen from "@/app/(dashboard)/profile";
import {editUsername, editUserProfile, getUserProfile} from "@/client/signalr/profileClient";
import EditProfileModal from "@/components/profile/EditProfile";
import {uploadProfileImage} from "@/client/api/cloudinaryClient";

jest.mock("@/context/AuthContext", () => ({
    useAuth: jest.fn(),
}));

jest.mock("@/client/signalr/profileClient", () => ({
    getUserProfile: jest.fn(),
    editUserProfile: jest.fn(),
    editUsername: jest.fn(),
}));

jest.mock("@/client/api/cloudinaryClient", () => ({
    uploadProfileImage: jest.fn(),
}));

const testUser = {
    id: 1,
    username: "johnsmith",
    firstName: "John",
    lastName: "Smith",
    email: "john.smith@example.com",
};

const testProfile = {
    firstname: "John",
    lastname: "Smith",
    username: "johnsmith",
    email: "john.smith@example.com",
    bio: "I enjoy building software.",
    profileImage: null,
};

const mockLoginContext = {
    user: testUser,
    token: "fake-jwt-token",
    preferences: {
        theme: "SepiaLight",
        userProfileResponse: testProfile,
    },
};

beforeEach(() => {
    jest.resetAllMocks();
});

describe("ProfileScreen", () => {
    it("renders the profile using preferences without calling the backend", async () => {
        (useAuth as jest.Mock).mockReturnValue(mockLoginContext);

        await render(<ProfileScreen />);

        expect(await screen.findByText("My profile")).toBeTruthy();
        expect(screen.getByText("John Smith")).toBeTruthy();
        expect(screen.getByText("@johnsmith")).toBeTruthy();
        expect(
            screen.getAllByText("I enjoy building software.").length,
        ).toBeGreaterThan(0);
        expect(screen.getByText("john.smith@example.com")).toBeTruthy();

        expect(getUserProfile).not.toHaveBeenCalled();
    });

    it("falls back to user context details when profile fields are missing", async () => {
        (useAuth as jest.Mock).mockReturnValue({
            ...mockLoginContext,
            preferences: {
                theme: "SepiaLight",
                userProfileResponse: {},
            },
        });

        await render(<ProfileScreen />);

        expect(await screen.findByText("My profile")).toBeTruthy();
        expect(screen.getByText("John Smith")).toBeTruthy();
        expect(screen.getByText("@johnsmith")).toBeTruthy();
        expect(screen.getByText("john.smith@example.com")).toBeTruthy();

        expect(getUserProfile).not.toHaveBeenCalled();
    });

    it("loads the profile through the mocked API client when preferences are absent", async () => {
        (useAuth as jest.Mock).mockReturnValue({
            user: testUser,
            token: "fake-jwt-token",
            preferences: null,
        });

        (getUserProfile as jest.Mock).mockResolvedValue(testProfile);

        await render(<ProfileScreen />);

        expect(await screen.findByText("Your account details")).toBeTruthy();

        await waitFor(() => {
            expect(getUserProfile).toHaveBeenCalledWith(
                "fake-jwt-token",
                testUser.id,
            );
        });

        expect(screen.getByText("John Smith")).toBeTruthy();
        expect(screen.getByText("@johnsmith")).toBeTruthy();
    });


    const testColours = {
        background: "#f3e7d0",
        surface: "#fff8e8",
        border: "#d8c3a5",
        primary: "#8f7257",
        primaryDark: "#6f5742",
        text: "#33261c",
        textMuted: "#786553",
        textLight: "#ffffff",
        success: "#2e7d32",
        error: "#c62828",
        borderDark: "#6f5742",
    };

    const createEditModalProps = () => ({
        visible: true,
        token: "fake-jwt-token",
        userId: 1,
        profile: testProfile,
        colours: testColours,
        onClose: jest.fn(),
        onSaved: jest.fn(),
    });

    describe("EditProfileModal", () => {
        beforeEach(() => {
            jest.resetAllMocks();

            (useAuth as jest.Mock).mockReturnValue({
                preferences: null,
                user: testUser,
                token: "fake-jwt-token",
            });
        });

        it("renders the existing profile details when opened", async () => {
            const props = createEditModalProps();

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            expect(screen.getByText("Edit your profile")).toBeTruthy();
            expect(screen.getByDisplayValue("johnsmith")).toBeTruthy();
            expect(screen.getByDisplayValue("John")).toBeTruthy();
            expect(screen.getByDisplayValue("Smith")).toBeTruthy();
            expect(
                screen.getByDisplayValue("I enjoy building software."),
            ).toBeTruthy();

            expect(getUserProfile).not.toHaveBeenCalled();
            expect(editUserProfile).not.toHaveBeenCalled();
            expect(editUsername).not.toHaveBeenCalled();
            expect(uploadProfileImage).not.toHaveBeenCalled();
        });

        it("does not display the modal when visible is false", async () => {
            const props = {
                ...createEditModalProps(),
                visible: false,
            };

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            expect(screen.queryByText("Edit your profile")).toBeNull();
        });

        it("rejects an empty username without making API calls", async () => {
            const props = createEditModalProps();

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            await fireEvent.changeText(
                screen.getByPlaceholderText("Choose a username"),
                "   ",
            );

            await fireEvent.press(screen.getByText("Save changes"));

            expect(
                await screen.findByText("Username cannot be empty."),
            ).toBeTruthy();

            expect(editUserProfile).not.toHaveBeenCalled();
            expect(editUsername).not.toHaveBeenCalled();
            expect(uploadProfileImage).not.toHaveBeenCalled();
            expect(props.onSaved).not.toHaveBeenCalled();
            expect(props.onClose).not.toHaveBeenCalled();
        });

        it("saves profile changes and closes the modal", async () => {
            const props = createEditModalProps();

            (editUserProfile as jest.Mock).mockResolvedValue({
                firstname: "Jonathan",
                lastname: "Smith",
                bio: "Updated bio",
                profileImage: null,
                email: "john.smith@example.com",
            });

            (editUsername as jest.Mock).mockResolvedValue({
                username: "johnny",
            });

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            await fireEvent.changeText(
                screen.getByPlaceholderText("Choose a username"),
                "johnny",
            );

            await fireEvent.changeText(
                screen.getByPlaceholderText("First name"),
                "Jonathan",
            );

            await fireEvent.changeText(
                screen.getByPlaceholderText("Tell people a little about yourself..."),
                "Updated bio",
            );

            await fireEvent.press(screen.getByText("Save changes"));

            await waitFor(() => {
                expect(editUserProfile).toHaveBeenCalledWith(
                    "fake-jwt-token",
                    {
                        userId: 1,
                        firstname: "Jonathan",
                        lastname: "Smith",
                        profileImage: undefined,
                        bio: "Updated bio",
                    },
                );

                expect(editUsername).toHaveBeenCalledWith(
                    "fake-jwt-token",
                    "johnny",
                    1,
                );

                expect(props.onSaved).toHaveBeenCalledWith({
                    firstname: "Jonathan",
                    lastname: "Smith",
                    bio: "Updated bio",
                    profileImage: undefined,
                    email: "john.smith@example.com",
                    userId: 1,
                    username: "johnny",
                });

                expect(props.onClose).toHaveBeenCalled();
            });

            expect(uploadProfileImage).not.toHaveBeenCalled();
        });

        it("shows username suggestions when the username is already taken", async () => {
            const props = createEditModalProps();

            (editUserProfile as jest.Mock).mockResolvedValue({
                firstname: "John",
                lastname: "Smith",
                bio: "I enjoy building software.",
                profileImage: null,
                email: "john.smith@example.com",
            });

            (editUsername as jest.Mock).mockRejectedValue(
                new Error("Username already in use"),
            );

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            await fireEvent.changeText(
                screen.getByPlaceholderText("Choose a username"),
                "takenname",
            );

            await fireEvent.press(screen.getByText("Save changes"));

            expect(
                await screen.findByText("That username is already taken."),
            ).toBeTruthy();

            expect(screen.getByText("Try one of these instead:")).toBeTruthy();
            expect(screen.getByText("takenname1")).toBeTruthy();
            expect(screen.getByText("takenname2")).toBeTruthy();
            expect(screen.getByText("takenname_1")).toBeTruthy();

            expect(props.onSaved).not.toHaveBeenCalled();
            expect(props.onClose).not.toHaveBeenCalled();
            expect(uploadProfileImage).not.toHaveBeenCalled();
        });

        it("allows the user to select a suggested username", async () => {
            const props = createEditModalProps();

            (editUserProfile as jest.Mock).mockResolvedValue({
                firstname: "John",
                lastname: "Smith",
                bio: "",
                profileImage: null,
            });

            (editUsername as jest.Mock).mockRejectedValue(
                new Error("Username already in use"),
            );

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            await fireEvent.changeText(
                screen.getByPlaceholderText("Choose a username"),
                "takenname",
            );

            await fireEvent.press(screen.getByText("Save changes"));

            expect(
                await screen.findByText("That username is already taken."),
            ).toBeTruthy();

            await fireEvent.press(screen.getByText("takenname1"));

            expect(screen.getByDisplayValue("takenname1")).toBeTruthy();
            expect(
                screen.queryByText("Try one of these instead:"),
            ).toBeNull();
        });

        it("closes the modal when Cancel is pressed", async () => {
            const props = createEditModalProps();

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            await fireEvent.press(screen.getByText("Cancel"));

            expect(props.onClose).toHaveBeenCalledTimes(1);
            expect(editUserProfile).not.toHaveBeenCalled();
            expect(editUsername).not.toHaveBeenCalled();
        });

        it("closes the modal using the close button", async () => {
            const props = createEditModalProps();

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            await fireEvent.press(
                screen.getByLabelText("Close edit profile"),
            );

            expect(props.onClose).toHaveBeenCalledTimes(1);
            expect(editUserProfile).not.toHaveBeenCalled();
        });

        it("displays an error when saving fails", async () => {
            const props = createEditModalProps();

            (editUserProfile as jest.Mock).mockRejectedValue(
                new Error("Unable to update profile"),
            );

            // @ts-ignore
            await render(<EditProfileModal {...props} />);

            await fireEvent.press(screen.getByText("Save changes"));

            expect(
                await screen.findByText("Unable to update profile"),
            ).toBeTruthy();

            expect(props.onSaved).not.toHaveBeenCalled();
            expect(props.onClose).not.toHaveBeenCalled();
        });
    });

});
