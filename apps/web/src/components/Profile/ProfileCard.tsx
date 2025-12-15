import { CheckBadgeIcon } from "@heroicons/react/24/solid";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router";
import { Card } from "@/components/Shared/UI";
import { useAccountStore } from "@/store/persisted/useAccountStore";
import { apiClient } from "@/lib/apiClient";
import cn from "@/helpers/cn";
import getAccount from "@slice/helpers/getAccount";
import getAvatar from "@slice/helpers/getAvatar";
import { TRANSFORMS } from "@slice/data/constants";
import { useAccountStatsQuery } from "@slice/indexer";
import humanize from "@/helpers/humanize";

interface User {
  profileId: string;
  username?: string;
  professionalRoles?: string[];
  reputationScore: number;
  rewardPoints: number;
  level: number;
  isWarned: boolean;
  isBanned: boolean;
  createdAt: string;
}

interface ProfileCardProps {
  /**
   * home  = chỉ hiển thị info + followers / following
   * tasks = hiển thị thêm reputation progress + reward points
   */
  variant?: "home" | "tasks";
}

const ProfileCard = ({ variant = "home" }: ProfileCardProps) => {
  const { currentAccount } = useAccountStore();
  const [user, setUser] = useState<User | null>(null);

  // Chuẩn hoá dữ liệu account - ALWAYS call hooks
  const accountInfo = useMemo(
    () => (currentAccount ? getAccount(currentAccount as any) : null),
    [currentAccount]
  );

  // Stats followers / following - ALWAYS call hooks
  const { data: statsData } = useAccountStatsQuery({
    variables: { request: { account: currentAccount?.address || "" } },
    skip: !currentAccount?.address,
  });

  useEffect(() => {
    const loadUser = async () => {
      try {
        if (!currentAccount?.address) return;
        const profileId = currentAccount.address;
        const data = await apiClient.getUser(profileId);

        setUser({
          profileId: data?.profileId || profileId,
          username: data?.username || data?.handle || undefined,
          professionalRoles: data?.professionalRoles || [],
          reputationScore:
            typeof data?.reputationScore === "number"
              ? data.reputationScore
              : Number(data?.reputation) || 0,
          rewardPoints:
            typeof data?.rewardPoints === "number"
              ? data.rewardPoints
              : Number(data?.points) || 0,
          level: Number(data?.level) || 0,
          isWarned: data?.isWarned ?? false,
          isBanned: data?.isBanned ?? false,
          createdAt: data?.createdAt || new Date().toISOString(),
        });
      } catch (err) {
        console.error("Failed to load user profile", err);
      }
    };

    loadUser();
  }, [currentAccount]);

  // Calculate progressWidth - BEFORE early return
  const reputation = user?.reputationScore ?? 0;
  const progressWidth = useMemo(
    () => Math.min(100, Math.max(0, reputation)),
    [reputation]
  );

  // Early return AFTER all hooks
  if (!currentAccount) return null;

  const graphStats = statsData?.accountStats?.graphFollowStats;
  const followers = graphStats?.followers ?? 0;
  const following = graphStats?.following ?? 0;

  // Tên hiển thị
  const displayName =
    accountInfo?.name ||
    (currentAccount as any)?.metadata?.name ||
    (currentAccount as any)?.handle ||
    "Unnamed user";

  // Username
  const rawUsernameFromUser = user?.username?.trim();
  const usernameFromBackend =
    rawUsernameFromUser && rawUsernameFromUser.replace(/^@/, "");

  const usernameWithPrefix =
    accountInfo?.usernameWithPrefix ||
    (usernameFromBackend ? `@${usernameFromBackend}` : "") ||
    (currentAccount.address
      ? `@${currentAccount.address.slice(0, 6)}…${currentAccount.address.slice(
          -4
        )}`
      : "@unknown");

  // Bio
  const bio =
    (currentAccount as any)?.metadata?.bio ||
    (user?.professionalRoles || []).join(" • ") ||
    "No bio yet.";

  const avatarUrl = getAvatar(currentAccount as any, TRANSFORMS.AVATAR_BIG);
  const coverUrl = (currentAccount as any)?.metadata?.coverPicture ?? null;

  // Stats cho tasks - already calculated above before early return
  const rewardPoints = user?.rewardPoints ?? 0;
  const level = user?.level ?? 1;

  const accountLink = accountInfo?.link || `/${currentAccount.address}`;

  return (
    <Link to={accountLink}>
      <Card
        className={cn(
          "overflow-hidden rounded-2xl cursor-pointer transition-transform",
          // Light mode
          "border border-gray-200 bg-white",
          // Dark mode
          "dark:border-gray-700 dark:bg-black"
        )}
      >
        {/* Phần trên: Cover */}
        <div className="relative h-24 sm:h-28">
          {coverUrl ? (
            <img
              src={coverUrl}
              alt="Cover"
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-r from-brand-500/70 via-brand-300/60 to-brand-500/70" />
          )}

          {/* Avatar overlap */}
          <div className="absolute -bottom-10 left-4 flex items-center gap-3">
            <div className="h-18 w-18 rounded-full border-[3px] bg-gray-100 overflow-hidden border-white dark:border-gray-950 dark:bg-gray-900 mb-0">
              <img
                src={avatarUrl}
                alt={displayName}
                className="h-full w-full object-cover"
                loading="eager"
              />
            </div>
            {/* Desktop: tên + username */}
            <div className="hidden sm:flex flex-col pt-6">
              <div className="flex items-center gap-1">
                <span className="text-base font-semibold text-gray-900 dark:text-white">
                  {displayName}
                </span>
                {(currentAccount as any)?.hasSubscribed && (
                  <CheckBadgeIcon className="size-4 text-brand-500" />
                )}
              </div>
              <span className="text-sm text-gray-500 dark:text-gray-400">
                {usernameWithPrefix}
              </span>
            </div>
          </div>
        </div>

        {/* Phần dưới */}
        <div className="pt-12 px-4 pb-4 space-y-4">
          {/* Mobile: tên + username */}
          <div className="sm:hidden">
            <div className="flex items-center gap-1 text-base font-semibold text-gray-900 dark:text-white">
              {displayName}
              {(currentAccount as any)?.hasSubscribed && (
                <CheckBadgeIcon className="size-4 text-brand-500" />
              )}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {usernameWithPrefix}
            </div>
          </div>

          {/* Bio */}
          <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
            {bio}
          </p>

          {variant === "home" ? (
            /* ========== HOME: Followers / Following ========== */
            <div className="flex items-center gap-6 text-sm text-gray-500 dark:text-gray-400">
              <span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {humanize(following)}
                </span>{" "}
                Following
              </span>
              <span>
                <span className="font-semibold text-gray-900 dark:text-white">
                  {humanize(followers)}
                </span>{" "}
                Followers
              </span>
            </div>
          ) : (
            /* ========== TASKS: Reputation + Reward ========== */
            <>
              {/* Status Badge for Warned/Banned */}
              {user?.isBanned && (
                <div className="rounded-lg bg-red-100 px-3 py-2 text-center dark:bg-red-900/30">
                  <span className="text-sm font-medium text-red-700 dark:text-red-400">
                    🚫 Tài khoản bị khóa
                  </span>
                </div>
              )}
              {user?.isWarned && !user?.isBanned && (
                <div className="rounded-lg bg-yellow-100 px-3 py-2 text-center dark:bg-yellow-900/30">
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-400">
                    ⚠️ Cảnh báo: Điểm uy tín thấp
                  </span>
                </div>
              )}

              {/* Progress + Level */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-500 dark:text-gray-400">
                    Reputation progress
                  </span>
                  <span
                    className={cn(
                      "font-medium",
                      user?.isBanned
                        ? "text-red-600 dark:text-red-400"
                        : user?.isWarned
                        ? "text-yellow-600 dark:text-yellow-400"
                        : "text-gray-900 dark:text-gray-100"
                    )}
                  >
                    {reputation}
                  </span>
                </div>
                <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      user?.isBanned
                        ? "bg-gradient-to-r from-red-400 to-red-600"
                        : user?.isWarned
                        ? "bg-gradient-to-r from-yellow-400 to-orange-500"
                        : "bg-gradient-to-r from-yellow-400 to-yellow-600"
                    )}
                    style={{ width: `${progressWidth}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                  <span>Level {level}</span>
                  <span>Reach 100 to level up</span>
                </div>
              </div>

              {/* Reward points */}
              <div className="flex items-center justify-between rounded-xl bg-gray-50 px-3 py-2 dark:bg-gray-900/60">
                <div>
                  <div className="text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400">
                    Reward Points
                  </div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-white">
                    {rewardPoints.toLocaleString()}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-[11px] font-medium text-yellow-700 dark:bg-yellow-500/15 dark:text-yellow-300">
                    💎 Loyal Contributor
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-gray-400">
                    Earn more by completing tasks
                  </span>
                </div>
              </div>
            </>
          )}
        </div>
      </Card>
    </Link>
  );
};

export default ProfileCard;
