import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";


export default function LandingPage() {
    return (
        <ScrollView className="flex-1 bg-[#8f7257]">
            <View className="px-6 pb-12 pt-16">

                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#f3e7d0]">
                            <Text className="text-lg font-bold text-[#4b3828]">
                                K
                            </Text>
                        </View>

                        <Text className="text-2xl font-bold text-[#fff5e6]">
                            Kanban
                        </Text>
                    </View>

                    <Pressable
                        onPress={() => router.push("/(auth)/login")}
                    >
                        <Text className="font-semibold text-[#f3e7d0]">
                            Log in
                        </Text>
                    </Pressable>
                </View>


                <View className="mt-24">
                    <Text className="text-sm font-bold uppercase tracking-[2px] text-[#ead8bd]">
                        Project management
                    </Text>

                    <Text className="mt-4 text-5xl font-bold leading-[1.05] text-[#fff5e6]">
                        Make your work visible.
                    </Text>

                    <Text className="mt-6 text-lg leading-7 text-[#ead8bd]">
                        Kanban helps you organise projects by turning your
                        work into a visual flow of tasks.
                    </Text>
                </View>


                <View className="mt-10 rounded-3xl border border-[#b99b7b] bg-[#7c6149] p-4">
                    <Text className="mb-4 text-sm font-bold text-[#f3e7d0]">
                        PROJECT BOARD
                    </Text>

                    <View className="gap-3">
                        <MobileColumn
                            title="To do"
                            tasks={["Design homepage", "Create workspace"]}
                        />

                        <MobileColumn
                            title="In progress"
                            tasks={["Build authentication"]}
                        />

                        <MobileColumn
                            title="Done"
                            tasks={["Set up database"]}
                        />
                    </View>
                </View>


                <Pressable
                    onPress={() => router.push("/(auth)/register")}
                    className="mt-8 items-center rounded-2xl bg-[#f3e7d0] py-4"
                >
                    <Text className="font-bold text-[#4b3828]">
                        Create an account
                    </Text>
                </Pressable>


                <View className="mt-20 rounded-3xl bg-[#f3e7d0] p-7">
                    <Text className="text-sm font-bold uppercase tracking-[2px] text-[#977856]">
                        What is Kanban?
                    </Text>

                    <Text className="mt-4 text-3xl font-bold leading-tight text-[#4b3828]">
                        See what needs doing, what is happening, and what is
                        finished.
                    </Text>

                    <Text className="mt-5 text-base leading-7 text-[#80664b]">
                        Work moves through columns as your project progresses.
                        Instead of keeping everything in your head, Kanban
                        gives you a clear visual picture of your work.
                    </Text>
                </View>


                <View className="mt-5 gap-4">
                    <MobileFeature
                        title="Organise"
                        text="Create workspaces and boards for different projects."
                    />

                    <MobileFeature
                        title="Plan"
                        text="Break projects into columns and individual tasks."
                    />

                    <MobileFeature
                        title="Collaborate"
                        text="Work with other members inside shared workspaces."
                    />
                </View>


                <View className="mt-16 items-center">
                    <Text className="text-center text-3xl font-bold text-[#fff5e6]">
                        Ready to get organised?
                    </Text>

                    <Text className="mt-3 text-center leading-6 text-[#ead8bd]">
                        Start with a workspace and build your first board.
                    </Text>

                    <Pressable
                        onPress={() => router.push("/(auth)/register")}
                        className="mt-6 rounded-2xl border border-[#c4aa8c] px-7 py-4"
                    >
                        <Text className="font-bold text-[#fff5e6]">
                            Get started
                        </Text>
                    </Pressable>
                </View>
            </View>
        </ScrollView>
    );
}

function MobileColumn({
                          title,
                          tasks,
                      }: {
    title: string;
    tasks: string[];
}) {
    return (
        <View className="rounded-2xl bg-[#eadbc4] p-4">
            <Text className="mb-3 font-bold text-[#594331]">
                {title}
            </Text>

            {tasks.map((task) => (
                <View
                    key={task}
                    className="mb-2 rounded-xl bg-[#f7eddd] p-3"
                >
                    <Text className="text-sm font-semibold text-[#5a4431]">
                        {task}
                    </Text>
                </View>
            ))}
        </View>
    );
}

function MobileFeature({
                           title,
                           text,
                       }: {
    title: string;
    text: string;
}) {
    return (
        <View className="rounded-2xl border border-[#b99b7b] bg-[#a08364] p-5">
            <Text className="text-xl font-bold text-[#fff5e6]">
                {title}
            </Text>

            <Text className="mt-2 leading-6 text-[#ead8bd]">
                {text}
            </Text>
        </View>
    );
}