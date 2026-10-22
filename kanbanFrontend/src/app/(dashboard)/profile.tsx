import {useAuth} from "@/context/AuthContext";
import {useEffect, useState} from "react";
import {getUserProfile, UserProfileResponse} from "@/client/signalr/profileClient";
import {AppTheme, themes} from "@/theme/themes";
import {ScrollView, View, Text, Pressable, ActivityIndicator} from "react-native";
import {Image} from "expo-image"

export default function ProfileScreen(){
    const {preferences, user, token} = useAuth();
    const [profile, setProfile] = useState<UserProfileResponse>({});
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [isEditHovered, setIsEditHovered] = useState(false);

    const defaultTheme = AppTheme.SepiaLight;
    const theme = preferences?.theme ?? defaultTheme;
    const colours = themes[theme] ?? themes[defaultTheme];

    useEffect(() => {
        const loadProfile = async () => {
            if(preferences){
                setProfile(preferences.userProfileResponse)
            } else {
                if(!token || !user){
                    throw new Error("No token provided");
                }
                const res = await getUserProfile(token, user.id);
                setProfile(res);
            }
        }

        loadProfile()
    }, []);

    const firstName = profile?.firstname ?? user?.firstName ?? "";
    const lastName = profile?.lastname ?? user?.lastName ?? "";
    const username = profile?.username ?? user?.username ?? "";
    const email = profile?.email ?? user?.email ?? "";
    const fullName =
        [firstName, lastName].filter(Boolean).join(" ") ||
        username ||
        "Your profile";
    const initials =
        [firstName, lastName]
            .filter(Boolean)
            .map((name) => name.charAt(0).toUpperCase())
            .join("")
            .slice(0, 2) ||
        username.slice(0, 2).toUpperCase() ||
        "?";


    return (
        <ScrollView
            className="flex-1"
            style={{ backgroundColor: colours.background }}
            contentContainerClassName="flex-grow"
        >
            <View className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
                <View className="mb-8">
                    <Text
                        className="text-3xl font-bold tracking-tight"
                        style={{ color: colours.text }}
                    >
                        My profile
                    </Text>
                    <Text
                        className="mt-2 text-sm"
                        style={{ color: colours.textMuted }}
                    >
                        Manage how you appear to others on Kanban.
                    </Text>
                </View>

                {isLoading ? (
                    <View className="items-center justify-center rounded-2xl border px-6 py-20"
                          style={{
                              backgroundColor: colours.surface,
                              borderColor: colours.border,
                          }}
                    >
                        <ActivityIndicator
                            size="large"
                            color={colours.primary}
                        />
                        <Text
                            className="mt-4 text-sm"
                            style={{ color: colours.textMuted }}
                        >
                            Loading your profile...
                        </Text>
                    </View>
                ) : error ? (
                    <View
                        className="items-center rounded-2xl border px-6 py-12"
                        style={{
                            backgroundColor: colours.surface,
                            borderColor: colours.border,
                        }}
                    >
                        <Text
                            className="text-lg font-semibold"
                            style={{ color: colours.text }}
                        >
                            Couldn't load your profile
                        </Text>
                        <Text
                            className="mt-2 text-center text-sm"
                            style={{ color: colours.textMuted }}
                        >
                            {error}
                        </Text>
                        <Pressable
                            onPress={() => {
                                setError(null);
                                setIsLoading(true);

                                if (!token || !user) {
                                    setError("No token provided");
                                    setIsLoading(false);
                                    return;
                                }

                                getUserProfile(token, user.id)
                                    .then(setProfile)
                                    .catch(() =>
                                        setError(
                                            "Unable to load your profile. Please try again."
                                        )
                                    )
                                    .finally(() => setIsLoading(false));
                            }}
                            className="mt-5 rounded-xl px-5 py-3 transition-colors"
                            style={{ backgroundColor: colours.primary }}
                        >
                            <Text
                                className="font-semibold"
                                style={{ color: colours.textLight }}
                            >
                                Try again
                            </Text>
                        </Pressable>
                    </View>
                ) : (
                    <>
                        <View
                            className="mb-6 overflow-hidden rounded-2xl border shadow-sm"
                            style={{
                                backgroundColor: colours.surface,
                                borderColor: colours.border,
                            }}
                        >
                            <View
                                className="h-32 sm:h-40"
                                style={{ backgroundColor: colours.primaryDark }}
                            >
                                <View
                                    className="h-full w-full opacity-20"
                                    style={{ backgroundColor: colours.primary }}
                                />
                            </View>

                            <View className="px-5 pb-6 sm:px-8">
                                <View className="-mt-12 flex-row flex-wrap items-end justify-between gap-4">
                                    {profile?.profileImage ? (
                                        <Image
                                            source={{ uri: profile.profileImage }}
                                            className="h-24 w-24 rounded-full border-4"
                                            style={{
                                                borderColor: colours.surface,
                                                backgroundColor: colours.background,
                                            }}
                                            resizeMode="cover"
                                        />
                                    ) : (
                                        <View
                                            className="h-24 w-24 items-center justify-center rounded-full border-4"
                                            style={{
                                                borderColor: colours.surface,
                                                backgroundColor: colours.primary,
                                            }}
                                        >
                                            <Text
                                                className="text-3xl font-bold"
                                                style={{ color: colours.textLight }}
                                            >
                                                {initials}
                                            </Text>
                                        </View>
                                    )}

                                    <Pressable
                                        onHoverIn={() => setIsEditHovered(true)}
                                        onHoverOut={() => setIsEditHovered(false)}
                                        onPress={() => {
                                            //TODO: Profile editing will be implemented later.
                                        }}
                                        accessibilityRole="button"
                                        accessibilityLabel="Edit profile"
                                        className="mb-1 flex-row items-center gap-2 rounded-xl border px-4 py-2.5 transition-all duration-200"
                                        style={{
                                            borderColor: isEditHovered
                                                ? colours.primary
                                                : colours.border,
                                            backgroundColor: isEditHovered
                                                ? colours.primary
                                                : colours.surface,
                                        }}
                                    >
                                        <Text
                                            className="text-sm font-semibold"
                                            style={{
                                                color: isEditHovered
                                                    ? colours.textLight
                                                    : colours.text,
                                            }}
                                        >
                                            Edit profile
                                        </Text>
                                        <Text
                                            className="text-base"
                                            style={{
                                                color: isEditHovered
                                                    ? colours.textLight
                                                    : colours.primary,
                                            }}
                                        >
                                            →
                                        </Text>
                                    </Pressable>
                                </View>

                                <View className="mt-5">
                                    <Text
                                        className="text-2xl font-bold tracking-tight sm:text-3xl"
                                        style={{ color: colours.text }}
                                    >
                                        {fullName}
                                    </Text>

                                    {username ? (
                                        <Text
                                            className="mt-1 text-sm"
                                            style={{ color: colours.textMuted }}
                                        >
                                            @{username}
                                        </Text>
                                    ) : null}

                                    <Text
                                        className="mt-4 text-sm leading-6 sm:text-base"
                                        style={{ color: colours.text }}
                                    >
                                        {profile?.bio ||
                                            "You haven't added a bio yet. Tell people a little about yourself."}
                                    </Text>
                                </View>
                            </View>
                        </View>


                        <View
                            className="mb-6 rounded-2xl border p-5 sm:p-7"
                            style={{
                                backgroundColor: colours.surface,
                                borderColor: colours.border,
                            }}
                        >
                            <View className="mb-5 flex-row items-center justify-between">
                                <View>
                                    <Text
                                        className="text-xl font-bold"
                                        style={{ color: colours.text }}
                                    >
                                        Bio
                                    </Text>
                                </View>

                            </View>

                            <Text
                                className="text-sm leading-6"
                                style={{ color: colours.text }}
                            >
                                {profile?.bio ||
                                    "Your bio will appear here once you've added one."}
                            </Text>
                        </View>


                        <View
                            className="rounded-2xl border p-5 sm:p-7"
                            style={{
                                backgroundColor: colours.surface,
                                borderColor: colours.border,
                            }}
                        >
                            <Text
                                className="text-xl font-bold"
                                style={{ color: colours.text }}
                            >
                                Account information
                            </Text>
                            <Text
                                className="mb-5 mt-1 text-sm"
                                style={{ color: colours.textMuted }}
                            >
                                Your account details
                            </Text>

                            <View
                                className="flex-row items-center gap-4 border-b py-4"
                                style={{ borderColor: colours.border }}
                            >
                                <View
                                    className="h-11 w-11 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: colours.background }}
                                >
                                    <Text
                                        className="font-bold"
                                        style={{ color: colours.primary }}
                                    >
                                        @
                                    </Text>
                                </View>

                                <View className="flex-1">
                                    <Text
                                        className="text-xs font-medium uppercase tracking-wider"
                                        style={{ color: colours.textMuted }}
                                    >
                                        Username
                                    </Text>
                                    <Text
                                        className="mt-1 text-sm font-medium"
                                        style={{ color: colours.text }}
                                    >
                                        {username || "Not provided"}
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row items-center gap-4 py-4">
                                <View
                                    className="h-11 w-11 items-center justify-center rounded-xl"
                                    style={{ backgroundColor: colours.background }}
                                >
                                    <Text
                                        className="text-lg font-semibold"
                                        style={{ color: colours.primary }}
                                    >
                                        ✉
                                    </Text>
                                </View>

                                <View className="flex-1">
                                    <Text
                                        className="text-xs font-medium uppercase tracking-wider"
                                        style={{ color: colours.textMuted }}
                                    >
                                        Email address
                                    </Text>
                                    <Text
                                        className="mt-1 text-sm font-medium"
                                        style={{ color: colours.text }}
                                    >
                                        {email || "Not provided"}
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </>
                )}
            </View>
        </ScrollView>
    );
}