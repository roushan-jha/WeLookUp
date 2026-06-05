import ProfileClient from "./ProfileClient";

type Props = {
  params: { id: string };
};

export default function ProfilePage({ params }: Props) {
  return <ProfileClient id={params.id} />;
}
