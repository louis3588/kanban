import { router } from "expo-router";
import { Pressable, ScrollView, Text, View } from "react-native";


export default function LandingPage() {
    return (
        <ScrollView
            className="flex-1 bg-[#8f7257]"
            contentContainerStyle={{ minHeight: "100%"}}
        >
            <View className="mx-auto w-full max-w-[1400px] px-8 py-6 lg:px-12">
                <View className="flex-row items-center justify-between rounded-2xl border border-[#bda78f] bg-[#9b7d61]/80 px-6 py-4">
                    <View className="flex-row items-center gap-3">
                        <View className="h-10 w-10 items-center justify-center rounded-xl bg-[#f3e7d0]">
                            <Text className="text-lg font-bold text-[#4b3828]">
                                K
                            </Text>
                        </View>

                        <Text className="text-2xl font-bold tracking-tight text-[#f7ecd9]">
                            Kanban
                        </Text>
                    </View>

                    <View className="flex-row items-center gap-3">
                        <Pressable
                            onPress={() => router.push("/(auth)/login")}
                            className="rounded-xl px-5 py-3"
                        >
                            <Text className="font-semibold text-[#f7ecd9]">
                                Log in
                            </Text>
                        </Pressable>

                        <Pressable
                            onPress={() => router.push("/(auth)/register")}
                            className="rounded-xl bg-[#f3e7d0] px-5 py-3"
                        >
                            <Text className="font-bold text-[#4b3828]">
                                Get started
                            </Text>
                        </Pressable>
                    </View>
                </View>
            </View>

            <View className="mx-auto w-full max-w-[1400px] px-8 pb-20 pt-16 lg:px-12 lg:pt-24">
                <View className="flex-row gap-12">
                    <View className="flex-1 justify-center">
                        <Text className="mb-5 text-sm font-bold uppercase tracking-[3px] text-[#ead8bd]">
                            Project management, simplified
                        </Text>

                        <Text className="max-w-[760px] text-6xl font-bold leading-[1.05] tracking-tight text-[#fff5e6] lg:text-8xl">
                            Make your work visible.
                        </Text>

                        <Text className="mt-7 max-w-[650px] text-xl leading-8 text-[#ead8bd] lg:text-2xl">
                            Kanban gives you a clear view of what needs doing,
                            what is in progress, and what has been completed.
                        </Text>

                        <View className="mt-9 flex-row gap-4">
                            <Pressable
                                onPress={() =>
                                    router.push("/(auth)/register")
                                }
                                className="rounded-2xl bg-[#f3e7d0] px-7 py-4"
                            >
                                <Text className="text-base font-bold text-[#4b3828]">
                                    Create your workspace
                                </Text>
                            </Pressable>

                            <Pressable
                                onPress={() => router.push("/(auth)/login")}
                                className="rounded-2xl border border-[#c4aa8c] px-7 py-4"
                            >
                                <Text className="text-base font-semibold text-[#fff5e6]">
                                    I already have an account
                                </Text>
                            </Pressable>
                        </View>
                    </View>

                    <View className="hidden flex-1 lg:flex">
                        <View className="rounded-3xl border border-[#c3a98b] bg-[#7c6149] p-5 shadow-2xl">
                            <View className="mb-5 flex-row items-center justify-between">
                                <View>
                                    <Text className="text-sm font-semibold text-[#ead8bd]">
                                        Workspace
                                    </Text>

                                    <Text className="mt-1 text-xl font-bold text-[#fff5e6]">
                                        Product Development
                                    </Text>
                                </View>

                                <View className="rounded-lg bg-[#f3e7d0] px-3 py-2">
                                    <Text className="text-xs font-bold text-[#4b3828]">
                                        BOARD
                                    </Text>
                                </View>
                            </View>

                            <View className="flex-row gap-3">
                                {[
                                    {
                                        title: "To do",
                                        tasks: [
                                            "Audit onboarding friction",
                                            "Design micro-interactions",
                                            "Build component variant library"
                                        ],
                                    },
                                    {
                                        title: "In progress",
                                        tasks: [
                                            "Flesh out edge case wireframes",
                                            "Handoff responsive layout specs",
                                            "Design heatmaps into core insights"
                                        ],
                                    },
                                    {
                                        title: "Done",
                                        tasks: [
                                            "Finalise UI design system",
                                            "Set up CI pipeline",
                                            "Conduct visual QA audit"
                                        ],
                                    },
                                ].map((column) => (
                                    <View
                                        key={column.title}
                                        className="flex-1 rounded-2xl bg-[#eadbc4] p-3"
                                    >
                                        <Text className="mb-3 text-sm font-bold text-[#594331]">
                                            {column.title}
                                        </Text>

                                        {column.tasks.map((task) => (
                                            <View
                                                key={task}
                                                className="mb-2 rounded-lg border border-[#d1b99a] bg-[#fff8eb] px-3 py-3 shadow-sm"
                                            >
                                                <View className="flex-row items-start gap-2">
                                                    <View className="mt-0.5 h-4 w-4 rounded border border-[#b89b78] bg-[#f7eddd]" />

                                                    <Text className="flex-1 text-xs font-medium leading-5 text-[#5a4431]">
                                                        {task}
                                                    </Text>
                                                </View>
                                            </View>
                                        ))}
                                    </View>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>
            </View>

            <View className="bg-[#f3e7d0] px-8 py-20 lg:px-12 lg:py-28">
                <View className="mx-auto w-full max-w-[1200px]">
                    <Text className="text-sm font-bold uppercase tracking-[3px] text-[#977856]">
                        What is Kanban?
                    </Text>

                    <Text className="mt-4 max-w-[900px] text-4xl font-bold leading-tight tracking-tight text-[#4b3828] lg:text-6xl">
                        A visual way to organise work and understand progress.
                    </Text>

                    <View className="mt-10 flex-row flex-wrap gap-5">
                        <FeatureCard
                            number="01"
                            title="See the work"
                            description="Keep tasks organised on boards so your projects are easy to understand at a glance."
                        />

                        <FeatureCard
                            number="02"
                            title="Move work forward"
                            description="Move tasks through columns as work progresses from an idea into something finished."
                        />

                        <FeatureCard
                            number="03"
                            title="Work together"
                            description="Create shared workspaces where teams can organise boards, tasks and responsibilities."
                        />
                    </View>
                </View>
            </View>

            <View className="bg-[#6f5742] px-8 py-20 lg:px-12 lg:py-28">
                <View className="mx-auto w-full max-w-[1200px]">
                    <View className="flex-row gap-12">
                        <View className="flex-1">
                            <Text className="text-sm font-bold uppercase tracking-[3px] text-[#d9c1a2]">
                                Built for the application
                            </Text>

                            <Text className="mt-4 text-4xl font-bold leading-tight text-[#fff5e6] lg:text-6xl">
                                Everything you need to manage a project.
                            </Text>

                            <Text className="mt-6 max-w-[650px] text-lg leading-8 text-[#dfc9ac]">
                                Create workspaces, build boards, organise
                                columns and manage individual tasks from one
                                place.
                            </Text>
                        </View>

                        <View className="flex-1 gap-4">
                            <InfoCard
                                title="Workspaces"
                                text="Keep different projects separated and give each workspace its own members and boards."
                            />

                            <InfoCard
                                title="Boards"
                                text="Turn a workspace into a visual project board with columns and tasks."
                            />

                            <InfoCard
                                title="Real-time updates"
                                text="Changes can be synchronised across active sessions using SignalR."
                            />
                        </View>
                    </View>
                </View>
            </View>

            <View className="bg-[#f3e7d0] px-8 py-24 lg:px-12">
                <View className="mx-auto max-w-[850px] items-center">
                    <Text className="text-center text-4xl font-bold leading-tight text-[#4b3828] lg:text-6xl">
                        Ready to organise your next project?
                    </Text>

                    <Text className="mt-5 max-w-[650px] text-center text-lg leading-7 text-[#80664b]">
                        Create a workspace and start turning your work into
                        something you can actually see.
                    </Text>

                    <Pressable
                        onPress={() => router.push("/(auth)/register")}
                        className="mt-8 rounded-2xl bg-[#5c4633] px-8 py-4"
                    >
                        <Text className="font-bold text-[#fff5e6]">
                            Get started with Kanban
                        </Text>
                    </Pressable>
                </View>
            </View>

            <View className="bg-[#4b3828] px-8 py-8">
                <View className="mx-auto w-full max-w-[1200px] flex-row items-center justify-between">
                    <Text className="font-bold text-[#f3e7d0]">
                        Kanban
                    </Text>

                    <Text className="text-sm text-[#cdb99c]">
                        Organise. Focus. Complete.
                    </Text>
                </View>
            </View>
        </ScrollView>
    );
}

function FeatureCard({
                         number,
                         title,
                         description,
                     }: {
    number: string;
    title: string;
    description: string;
}) {
    return (
        <View className="min-w-[280px] flex-1 rounded-3xl border border-[#d7c3a7] bg-[#f9f0e1] p-7 transition duration-200 hover:-translate-y-1 hover:border-[#b89a76] hover:bg-[#fff7e8] hover:shadow-lg">
            <Text className="text-sm font-bold text-[#a08361]">
                {number}
            </Text>

            <Text className="mt-8 text-2xl font-bold text-[#4b3828]">
                {title}
            </Text>

            <Text className="mt-3 text-base leading-7 text-[#80664b]">
                {description}
            </Text>
        </View>
    );
}

function InfoCard({
                      title,
                      text,
                  }: {
    title: string;
    text: string;
}) {
    return (
        <View className="rounded-2xl border border-[#95765a] bg-[#80654d] p-6 transition duration-200 hover:-translate-y-1 hover:border-[#bda78f] hover:bg-[#8c6f55] hover:shadow-lg">
            <Text className="text-xl font-bold text-[#fff5e6]">
                {title}
            </Text>

            <Text className="mt-2 leading-6 text-[#dfc9ac]">
                {text}
            </Text>
        </View>
    );
}