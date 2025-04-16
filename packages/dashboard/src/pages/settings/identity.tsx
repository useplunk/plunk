import { zodResolver } from "@hookform/resolvers/zod";
import { IdentitySchemas, type UtilitySchemas } from "@plunk/shared";
import { motion } from "framer-motion";
import { Copy, Unlink } from "lucide-react";
import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { Alert, Badge, Card, FullscreenLoader, Input, SettingTabs, Table } from "../../components";
import { Dashboard } from "../../layouts";
import { AWS_REGION } from "../../lib/constants";
import { useActiveProject, useActiveProjectVerifiedIdentity, useProjects } from "../../lib/hooks/projects";
import { network } from "../../lib/network";

interface EmailValues {
    email: string;
}

interface FromValues {
    from: string;
}

/**
 *
 */
export default function Index() {
    const activeProject = useActiveProject();
    const { mutate: projectsMutate } = useProjects();
    const { data: identity, mutate: identityMutate } = useActiveProjectVerifiedIdentity();

    const {
        register,
        handleSubmit,
        formState: { errors },
    } = useForm<EmailValues>({
        resolver: zodResolver(IdentitySchemas.create.omit({ id: true })),
    });

    const {
        register: registerUpdate,
        handleSubmit: handleSubmitUpdate,
        formState: { errors: errorsUpdate },
        reset,
    } = useForm<FromValues>({
        resolver: zodResolver(IdentitySchemas.update.omit({ id: true })),
    });

    useEffect(() => {
        if (!activeProject) {
            return;
        }

        reset({ from: activeProject.from ?? undefined });
    }, [reset, activeProject]);

    if (!activeProject || !identity) {
        return <FullscreenLoader />;
    }

    const create = async (data: EmailValues) => {
        toast.promise(
            network.fetch<
                {
                    success: true;
                    tokens: string[];
                },
                typeof IdentitySchemas.create
            >("POST", "/identities/create", {
                id: activeProject.id,
                ...data,
            }),
            {
                loading: "Adding your domain",
                success: (res) => {
                    void identityMutate({ tokens: res.tokens }, { revalidate: false });
                    void projectsMutate();

                    return "Added your domain";
                },
                error: "Could not add domain",
            },
        );
    };

    const update = async (data: FromValues) => {
        toast.promise(
            network.fetch<
                {
                    success: true;
                },
                typeof IdentitySchemas.update
            >("PUT", "/projects/update/identity", {
                id: activeProject.id,
                ...data,
            }),
            {
                loading: "Updating your sender name",
                success: () => {
                    void projectsMutate();

                    return 'Updated your sender name';
                },
                error: "Could not update sender name",
            },
        );
    };

    const unlink = async () => {
        toast.promise(
            network.fetch<
                {
                    success: true;
                },
                typeof UtilitySchemas.id
            >("POST", "/identities/reset", {
                id: activeProject.id,
            }),
            {
                loading: "Unlinking your domain",
                success: () => {
                    void projectsMutate();

                    return 'Unlinked your domain';
                },
                error: "Could not unlink domain",
            },
        );
    };

    const domain = activeProject.email?.split("@")[1] ?? "";
    const subdomain = domain.split(".").length > 2 ? domain.split(".")[0] : "";

    return (
        <>
            <Dashboard>
                <SettingTabs />

                <Card
                    title={"Domain"}
                    description={"By sending emails from your own domain you build up domain authority and trust."}
                    actions={
                        activeProject.email && (
                            <>
                                <button
                                    onClick={unlink}
                                    className={
                                        "flex items-center gap-x-2 rounded bg-red-600 px-8 py-2 text-center text-sm font-medium text-white transition ease-in-out hover:bg-red-700"
                                    }
                                >
                                    <Unlink strokeWidth={1.5} size={18} />
                                    Unlink domain
                                </button>
                            </>
                        )
                    }
                >
                    {activeProject.email && !activeProject.verified ? (
                        <>
                            <Alert type={"warning"} title={"Waiting for DNS verification"}>
                                Please add the following records to {activeProject.email.split("@")[1]} to verify {activeProject.email}, this
                                may take up to 15 minutes to register. <br />
                                In the meantime you can already start sending emails, we will automatically switch to your domain once it is
                                verified.
                            </Alert>

                            <div className="mt-6">
                                <Table
                                    values={[
                                        {
                                            Type: <Badge type={"info"}>TXT</Badge>,
                                            Key: (
                                                <div
                                                    className={"flex cursor-pointer items-center gap-3"}
                                                    onClick={() => {
                                                        void navigator.clipboard.writeText("plunk");
                                                        toast.success("Copied key to clipboard");
                                                    }}
                                                >
                                                    <p className={"font-mono text-sm"}>plunk</p>
                                                    <Copy size={14} />
                                                </div>
                                            ),
                                            Value: (
                                                <div
                                                    className={"flex cursor-pointer items-center gap-3"}
                                                    onClick={() => {
                                                        void navigator.clipboard.writeText("v=spf1 include:amazonses.com ~all");
                                                        toast.success("Copied value to clipboard");
                                                    }}
                                                >
                                                    <p className={"font-mono text-sm"}>v=spf1 include:amazonses.com ~all</p> <Copy size={14} />
                                                </div>
                                            ),
                                        },
                                        {
                                            type: <Badge type={"info"}>MX</Badge>,
                                            Key: (
                                                <div
                                                    className={"flex cursor-pointer items-center gap-3"}
                                                    onClick={() => {
                                                        void navigator.clipboard.writeText("plunk");
                                                        toast.success("Copied key to clipboard");
                                                    }}
                                                >
                                                    <p className={"font-mono text-sm"}>plunk</p>
                                                    <Copy size={14} />
                                                </div>
                                            ),
                                            Value: (
                                                <div
                                                    className={"flex cursor-pointer items-center gap-3"}
                                                    onClick={() => {
                                                        void navigator.clipboard.writeText(`10 feedback-smtp.${AWS_REGION}.amazonses.com`);
                                                        toast.success("Copied value to clipboard");
                                                    }}
                                                >
                                                    <p className={"font-mono text-sm"}>10 feedback-smtp.{AWS_REGION}.amazonses.com</p>
                                                    <Copy size={14} />
                                                </div>
                                            ),
                                        },
                                        ...identity.tokens.map((token) => {
                                            return {
                                                Type: <Badge type={"info"}>CNAME</Badge>,
                                                Key: (
                                                    <div
                                                        className={"flex cursor-pointer items-center gap-3"}
                                                        onClick={() => {
                                                            void navigator.clipboard.writeText(`${token}._domainkey${subdomain ? '.' + subdomain : ''}`);
                                                            toast.success("Copied key to clipboard");
                                                        }}
                                                    >
                                                        <p className={"font-mono text-sm"}>{token}._domainkey{subdomain ? '.' + subdomain : ''}</p>
                                                        <Copy size={14} />
                                                    </div>
                                                ),
                                                Value: (
                                                    <div
                                                        className={"flex cursor-pointer items-center gap-3"}
                                                        onClick={() => {
                                                            void navigator.clipboard.writeText(`${token}.dkim.amazonses.com`);
                                                            toast.success("Copied value to clipboard");
                                                        }}
                                                    >
                                                        <p className={"font-mono text-sm"}>{token}.dkim.amazonses.com</p>
                                                        <Copy size={14} />
                                                    </div>
                                                ),
                                            };
                                        }),
                                    ]}
                                />
                            </div>
                        </>
                    ) : activeProject.email && activeProject.verified ? (
                        <>
                            <Alert type={"success"} title={"Domain verified"}>
                                You have confirmed {activeProject.email} as your domain. Any emails sent by Plunk will now use this address.
                            </Alert>
                        </>
                    ) : (
                        <>
                            <form onSubmit={handleSubmit(create)} className="space-y-6">
                                <Input register={register("email")} error={errors.email} placeholder={"hello@example.com"} label={"Email"} />
                                <motion.button
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.9 }}
                                    className={
                                        "ml-auto flex items-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
                                    }
                                >
                                    <svg width="24" height="24" fill="none" viewBox="0 0 24 24">
                                        <path
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                            d="M12 5.75V18.25"
                                        />
                                        <path
                                            stroke="currentColor"
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth="1.5"
                                            d="M18.25 12L5.75 12"
                                        />
                                    </svg>
                                    Verify domain
                                </motion.button>
                            </form>
                        </>
                    )}
                </Card>

                <Card
                    title={"Sender name"}
                    description={
                        "The name that will be used when sending emails from Plunk. Your project name will be used by default"
                    }
                >
                    <form onSubmit={handleSubmitUpdate(update)} className="space-y-6">
                        <Input
                            register={registerUpdate("from")}
                            placeholder={activeProject.name}
                            label={"Name"}
                            error={errorsUpdate.from}
                        />

                        <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.9 }}
                            className={
                                "ml-auto flex items-center gap-x-0.5 rounded bg-neutral-800 px-8 py-2 text-center text-sm font-medium text-white"
                            }
                        >
                            Save
                        </motion.button>
                    </form>
                </Card>
            </Dashboard>
        </>
    );
}
