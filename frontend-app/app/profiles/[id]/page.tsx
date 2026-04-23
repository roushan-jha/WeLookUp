import ProfileClient from "./ProfileClient";

type Props = {
  params: { id: string } | Promise<{ id: string }>;
};

export default async function ProfilePage({ params }: Props) {
  const p = (await params) as { id: string };
  return <ProfileClient id={p.id} />;
}
