from datetime import datetime, timezone
from typing import List, Optional
from bson import ObjectId
from pydantic import BaseModel, Field
from dto.account.request.update_account_request import UpdateAccountRequest
from dto.post.request.update_comment_status_request import UpdateCommentStatusRequest
from dto.post.request.update_post_request import UpdatePostRequest
from dto.report.request.approve_report_request import ApproveReportRequest
from dto.report.request.ban_report_request import BanReportRequest
from dto.report.request.get_all_history_approve_request import GetAllHistoryApproveRequest
from dto.report.request.get_all_report_request import GetAllReportRequest
from dto.report.request.reject_report_request import RejectReportRequest
from dto.report.request.send_report_request import SendReportRequest
from dto.report.request.update_report_request import UpdateReportRequest
from dto.report.response.approve_report_response import ApproveReportResponse
from dto.report.response.ban_report_response import BanReportResponse
from dto.report.response.get_all_history_approve_reponse import GetAllHistoryApproveResponse
from dto.report.response.get_all_report_response import GetAllReportResponse, GetAllReport, Annunciator
from dto.report.response.reject_report_response import RejectReportResponse
from dto.report.response.send_report_response import SendReportResponse
from dto.report.response.update_report_response import UpdateReportResponse
from dto.statistic.request.get_report_of_day_request import GetReportOfDayRequest
from dto.statistic.request.get_top_report_request import GetTopReportRequest
from dto.statistic.response.get_report_of_day_response import GetReportOfDayResponse
from dto.statistic.response.get_top_report_response import GetTopReportReponse, TopReport
from models.announce_model import Announce
from repositories.announce_repository import AnnounceRepository
from repositories.comment_repository import CommentRepository
from services.impls.account_service_impl import AccountServiceImpl
from models.ban_model import Ban
from models.violation_model import Violation
from repositories.ban_repository import BanRepository
from repositories.policy_repository import PolicyRepository
from services.impls.post_service_impl import PostServiceImpl
from services.interfaces.report_service_interface import IReportService
from repositories.report_repository import ReportRepository
from repositories.account_repository import AccountRepository
from repositories.post_repository import PostRepository
from repositories.violation_repository import ViolationRepository
from models.report_model import Report
from models.account_model import Account, Permission
from models.policy_model import Policy
from models.post_model import Post
from models.base_model import PyObjectId, bson_to_dict
from collections import defaultdict
from typing import List

from core.redis import set_ban_countdown

class ReportServiceImpl(IReportService):

    async def get_policy(self, policyId: str) -> Policy:
        dic_policy = await PolicyRepository.find_by_id(policyId)
        return Policy(**bson_to_dict(dic_policy))
    
    async def get_user_infor(self, email: str) -> Account:
        dic_user = await AccountRepository.find_by_email(email)
        return Account(**bson_to_dict(dic_user))

    async def get_violation(self, violatorEmail: str, policyId: str) -> Violation | None:
        dic_violation = await ViolationRepository.find_by_violator_and_policy(violatorEmail, policyId)
        if dic_violation:
            return Violation(**bson_to_dict(dic_violation))
        return None

    async def get_all(self, report_list: GetAllReportRequest) -> Optional[List[GetAllReportResponse]]:
        account_list_rp: List[Report] = []
        dic_account_list_rp = await ReportRepository.find_all_account_report()
        if dic_account_list_rp:
            account_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_account_list_rp]

        post_list_rp: List[Report] = []
        dic_post_list_rp = await ReportRepository.find_all_post_report()
        if dic_post_list_rp:
            post_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_post_list_rp]

        comment_list_rp: List[Report] = []
        dic_comment_list_rp = await ReportRepository.find_all_comment_report()
        if dic_comment_list_rp:
            comment_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_comment_list_rp]
        
        message_list_rp: List[Report] = []
        dic_message_list_rp = await ReportRepository.find_all_message_report()
        if dic_message_list_rp:
            message_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_message_list_rp]

        rs_list: List[GetAllReport] = []
        if account_list_rp:
            for acc_rp in account_list_rp:
                violator_infor = await self.get_user_infor(acc_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(acc_rp.annunciatorEmail)
                policy_infor = await self.get_policy(acc_rp.policyId)
                rs_acc = GetAllReport (
                    id=str(acc_rp.id),
                    policyId=acc_rp.policyId,
                    policyName=policy_infor.name,
                    # violatorId=violator_infor.id,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    # annunciatorId=annunciator_infor.id,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=acc_rp.typeContent,
                    description=acc_rp.description,
                    reportedAt=acc_rp.reportedAt,
                    # verifyStatus=acc_rp.verifyStatus
                )
                rs_list.append(rs_acc)

        if post_list_rp:
            for post_rp in post_list_rp:
                violator_infor = await self.get_user_infor(post_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(post_rp.annunciatorEmail)
                policy_infor = await self.get_policy(post_rp.policyId)
                rs_post = GetAllReport (
                    id=str(post_rp.id),
                    policyId=post_rp.policyId,
                    policyName=policy_infor.name,
                    # violatorId=violator_infor.id,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    # annunciatorId=annunciator_infor.id,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=post_rp.typeContent,
                    contentId=post_rp.contentId,
                    description=post_rp.description,
                    reportedAt=post_rp.reportedAt,
                    # verifyStatus=post_rp.verifyStatus
                )
                rs_list.append(rs_post)

        if comment_list_rp:
            for comment_rp in comment_list_rp:
                violator_infor = await self.get_user_infor(comment_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(comment_rp.annunciatorEmail)
                policy_infor = await self.get_policy(comment_rp.policyId)
                rs_comment = GetAllReport (
                    id=str(comment_rp.id),
                    policyId=comment_rp.policyId,
                    policyName=policy_infor.name,
                    # violatorId=violator_infor.id,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    # annunciatorId=annunciator_infor.id,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=comment_rp.typeContent,
                    contentId=comment_rp.contentId,
                    contentParentId=comment_rp.contentParentId,
                    content=comment_rp.content,
                    description=comment_rp.description,
                    reportedAt=comment_rp.reportedAt,
                    # verifyStatus=comment_rp.verifyStatus
                )
                rs_list.append(rs_comment)

        if message_list_rp:
            for message_rp in message_list_rp:
                violator_infor = await self.get_user_infor(message_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(message_rp.annunciatorEmail)
                policy_infor = await self.get_policy(message_rp.policyId)
                rs_message = GetAllReport (
                    id=str(message_rp.id),
                    policyId=message_rp.policyId,
                    policyName=policy_infor.name,
                    # violatorId=violator_infor.id,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    # annunciatorId=annunciator_infor.id,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=message_rp.typeContent,
                    contentId=message_rp.contentId,
                    contentParentId=message_rp.contentParentId,
                    content=message_rp.content,
                    description=message_rp.description,
                    reportedAt=message_rp.reportedAt,
                    # verifyStatus=message_rp.verifyStatus
                )
                rs_list.append(rs_message)

        for rs_item in rs_list:
            vio = await self.get_violation(rs_item.violatorEmail, rs_item.policyId)
            if vio:
                dt: List[datetime] = []
                for time in vio.updatedAt:
                    dt.append(time.at)
                rs_item.violation = dt

        rs_list.sort(key=lambda x: x.reportedAt, reverse=True)
        rs_gr = self.group_reports(rs_list)

        return rs_gr


    def group_reports(self, reports: List[GetAllReport]) -> List[GetAllReportResponse]:
        grouped = defaultdict(list)

        for r in reports:
            if r.contentId:
                key = ("content", r.contentId, r.policyId)
            else:
                key = ("violator", r.violatorEmail, r.policyId)

            grouped[key].append(r)

        result = []

        for key, items in grouped.items():
            first = items[0]

            annunciators = [
                Annunciator(
                    annunciatorEmail=item.annunciatorEmail,
                    annunciatorName=item.annunciatorName,
                    description=item.description,
                    reportedAt=item.reportedAt
                )
                for item in items
            ]

            response = GetAllReportResponse(
                policyId=first.policyId,
                policyName=first.policyName,
                violatorEmail=first.violatorEmail,
                violatorName=first.violatorName,
                annunciator=annunciators,
                typeContent=first.typeContent,
                contentId=first.contentId,
                contentParentId=first.contentParentId,
                content=first.content,
                violation=first.violation
            )

            result.append(response)

        return result

    async def reject(self, report_req: RejectReportRequest) -> Optional[RejectReportResponse]:
        updated_report = await ReportRepository.update_check_by_element(report_req.model_dump(exclude_none=True), report_req.rejectBy)
        if updated_report:
            return RejectReportResponse(success=True, message="Ok")
        return RejectReportResponse(success=False, message="Error")

    async def approve(self, report_req: ApproveReportRequest) -> Optional[ApproveReportResponse]:
        updated_report = await ReportRepository.update_check_by_element(report_req.model_dump(exclude_none=True), report_req.approveBy)
        if updated_report:
            update_violation: str = None
            #announce
            polic: Policy = await self.get_policy(report_req.policyId)
            timestamp = datetime.now()
            #announce
            if report_req.element == "account":
                update_violation = await ViolationRepository.add_or_create_violation(report_req.elementId, report_req.policyId, datetime.now(), report_req.approveBy)
            else:
                violatorEmail = await ReportRepository.find_violator_email_by_content_id(report_req.elementId)
                if violatorEmail:
                    update_violation = await ViolationRepository.add_or_create_violation(violatorEmail, report_req.policyId, timestamp, report_req.approveBy)            

                    if report_req.element == "post":
                        post_service = PostServiceImpl()
                        req = UpdatePostRequest(id=report_req.elementId, status="off")
                        post = await post_service.update(req)
                        if post is None:
                            return RejectReportResponse(success=False, message="Error")
                        
                        #announce
                        contentAnnounce: str = ""
                        if post.post.title:
                            contentAnnounce = "Bài viết " + post.post.title + "... của bạn đã bị gỡ vì vi phạm chính sách: " + polic.name
                        else: contentAnnounce = "Bài viết của bạn đã bị gỡ vì vi phạm chính sách " + polic.name
                        announce = Announce(senderEmail="Hệ thống", receiverEmail=post.post.createdBy, type="report", contentAnnounce=contentAnnounce,
                                            isRead=False, createdAt=datetime.now(), contentId=str(post.post.id), policyName=polic.name,
                                            approveBy=report_req.approveBy, approveAt=timestamp)
                        dic_announce_insert = await AnnounceRepository.insert(announce.model_dump())
                        #announce

                    elif report_req.element == "comment":
                        post_service = PostServiceImpl()
                        post = await post_service.update_comment_status(report_req.elementParentId, report_req.elementId, "hidden")
                        if post is None:
                            return RejectReportResponse(success=False, message="Error")
                        
                        #announce
                        dic_comment_info = await CommentRepository.get_comment_info(post.post.id, report_req.elementId)
                        contentAnnounce: str = "Bình luận " + dic_comment_info.get("content") + "... của bạn đã bị gỡ vì vi phạm chính sách: " + polic.name
                        announce = Announce(senderEmail="Hệ thống", receiverEmail=dic_comment_info.get("commentBy"), type="report", contentAnnounce=contentAnnounce,
                                            isRead=False, createdAt=datetime.now(), contentId=report_req.elementId,
                                            contentParentId=str(post.post.id), content=dic_comment_info.get("content"), policyName=polic.name,
                                            approveBy=report_req.approveBy, approveAt=timestamp)
                        dic_announce_insert = await AnnounceRepository.insert(announce.model_dump())
                        #announce

            if update_violation is not None:
                violation = Violation(**bson_to_dict(update_violation))
                if len(violation.updatedAt) > 3:
                    dic_ban = await BanRepository.add_or_update_ban(violation.violatorEmail, str(violation.id))
                    if dic_ban:
                        ban = Ban(**bson_to_dict(dic_ban))
                        dic_acc = await AccountRepository.find_by_email(ban.violatorEmail)
                        acc = Account(**bson_to_dict(dic_acc))
                        pernum = acc.permission.pernum
                        dic_policy = await PolicyRepository.find_by_id(violation.policyId)
                        policy = Policy(**bson_to_dict(dic_policy))
                        pernum_policy = policy.action.permission

                        ban_pernum = ''.join(['1' if pernum[i] == '1' and pernum_policy[i] == '1' else '0' for i in range(len(pernum))])
                        latest_violation = max(ban.violations, key=lambda v: v.endAt)
                        latest_end_at = latest_violation.endAt
                        account_service = AccountServiceImpl()
                        acc_update = await account_service.update(account_req=UpdateAccountRequest(id=str(acc.id), permission=Permission(pernum=ban_pernum, validity=latest_end_at)))
                        if acc_update is None:
                            return RejectReportResponse(success=False, message="Error")
                        
                        #ban_with_redis
                        # delta = latest_end_at.replace(tzinfo=timezone.utc) - datetime.now(timezone.utc)
                        # seconds = int(delta.total_seconds())
                        seconds = 20
                        for idx, action in enumerate(["post", "comment", "message"]):
                            if ban_pernum[idx] == '0':
                                await set_ban_countdown(ban.violatorEmail, action, seconds)
                        #ban_with_redis

                        #announce
                        contentAnnounce: str = "Bạn đã bị " + polic.action.detail + " do vi phạm chính sách: " + polic.name + " quá nhiều lần"
                        announce = Announce(senderEmail="Hệ thống", receiverEmail=ban.violatorEmail, type="account", contentAnnounce=contentAnnounce,
                                            isRead=False, createdAt=datetime.now(), policyName=polic.name,
                                            approveBy=report_req.approveBy, approveAt=timestamp)
                        dic_announce_insert = await AnnounceRepository.insert(announce.model_dump())
                        #announce

                return ApproveReportResponse(success=True, message="Ok")
        return RejectReportResponse(success=False, message="Error")
    
    async def ban_report(self, report_req: BanReportRequest) -> Optional[BanReportResponse]:
        pass

    async def get_all_history_approve(self, report_req: GetAllHistoryApproveRequest) -> Optional[GetAllHistoryApproveResponse]:
        account_list_rp: List[Report] = []
        dic_account_list_rp = await ReportRepository.find_all_account_approve()
        if dic_account_list_rp:
            account_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_account_list_rp]

        post_list_rp: List[Report] = []
        dic_post_list_rp = await ReportRepository.find_all_post_approve()
        if dic_post_list_rp:
            post_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_post_list_rp]

        comment_list_rp: List[Report] = []
        dic_comment_list_rp = await ReportRepository.find_all_comment_approve()
        if dic_comment_list_rp:
            comment_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_comment_list_rp]
        
        message_list_rp: List[Report] = []
        dic_message_list_rp = await ReportRepository.find_all_message_approve()
        if dic_message_list_rp:
            message_list_rp = [Report(**bson_to_dict(dic)) for dic in dic_message_list_rp]

        rs_list: List[GetAllReport] = []
        if account_list_rp:
            for acc_rp in account_list_rp:
                violator_infor = await self.get_user_infor(acc_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(acc_rp.annunciatorEmail)
                policy_infor = await self.get_policy(acc_rp.policyId)
                rs_acc = GetAllReport (
                    id=str(acc_rp.id),
                    policyId=acc_rp.policyId,
                    policyName=policy_infor.name,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=acc_rp.typeContent,
                    description=acc_rp.description,
                    reportedAt=acc_rp.reportedAt,
                    approveBy=acc_rp.approveBy,
                    approveAt=acc_rp.approveAt
                )
                rs_list.append(rs_acc)

        if post_list_rp:
            for post_rp in post_list_rp:
                violator_infor = await self.get_user_infor(post_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(post_rp.annunciatorEmail)
                policy_infor = await self.get_policy(post_rp.policyId)
                rs_post = GetAllReport (
                    id=str(post_rp.id),
                    policyId=post_rp.policyId,
                    policyName=policy_infor.name,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=post_rp.typeContent,
                    contentId=post_rp.contentId,
                    description=post_rp.description,
                    reportedAt=post_rp.reportedAt,
                    approveBy=post_rp.approveBy,
                    approveAt=post_rp.approveAt
                )
                rs_list.append(rs_post)

        if comment_list_rp:
            for comment_rp in comment_list_rp:
                violator_infor = await self.get_user_infor(comment_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(comment_rp.annunciatorEmail)
                policy_infor = await self.get_policy(comment_rp.policyId)
                rs_comment = GetAllReport (
                    id=str(comment_rp.id),
                    policyId=comment_rp.policyId,
                    policyName=policy_infor.name,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=comment_rp.typeContent,
                    contentId=comment_rp.contentId,
                    contentParentId=comment_rp.contentParentId,
                    content=comment_rp.content,
                    description=comment_rp.description,
                    reportedAt=comment_rp.reportedAt,
                    approveBy=comment_rp.approveBy,
                    approveAt=comment_rp.approveAt
                )
                rs_list.append(rs_comment)

        if message_list_rp:
            for message_rp in message_list_rp:
                violator_infor = await self.get_user_infor(message_rp.violatorEmail)
                annunciator_infor = await self.get_user_infor(message_rp.annunciatorEmail)
                policy_infor = await self.get_policy(message_rp.policyId)
                rs_message = GetAllReport (
                    id=str(message_rp.id),
                    policyId=message_rp.policyId,
                    policyName=policy_infor.name,
                    violatorEmail=violator_infor.email,
                    violatorName=violator_infor.userInfo.fullName,
                    annunciatorEmail=annunciator_infor.email,
                    annunciatorName=annunciator_infor.userInfo.fullName,
                    typeContent=message_rp.typeContent,
                    contentId=message_rp.contentId,
                    contentParentId=message_rp.contentParentId,
                    content=message_rp.content,
                    description=message_rp.description,
                    reportedAt=message_rp.reportedAt,
                    approveBy=message_rp.approveBy,
                    approveAt=message_rp.approveAt
                )
                rs_list.append(rs_message)

        for rs_item in rs_list:
            vio = await self.get_violation(rs_item.violatorEmail, rs_item.policyId)
            if vio:
                dt: List[datetime] = []
                for time in vio.updatedAt:
                    dt.append(time.at)
                rs_item.violation = dt

        rs_list.sort(key=lambda x: x.reportedAt, reverse=True)
        rs_gr = self.group_approve(rs_list)

        return rs_gr
    
    def group_approve(self, reports: List[GetAllReport]) -> List[GetAllHistoryApproveResponse]:
        grouped = defaultdict(list)

        for r in reports:
            if r.contentId:
                key = ("content", r.contentId, r.policyId, r.approveBy, r.approveAt)
            else:
                key = ("violator", r.violatorEmail, r.policyId, r.approveBy, r.approveAt)

            grouped[key].append(r)

        result = []

        for key, items in grouped.items():
            first = items[0]
            response = GetAllHistoryApproveResponse(
                policyId=first.policyId,
                policyName=first.policyName,
                violatorEmail=first.violatorEmail,
                violatorName=first.violatorName,
                typeContent=first.typeContent,
                contentId=first.contentId,
                contentParentId=first.contentParentId,
                content=first.content,
                approveBy=first.approveBy,
                approveAt=first.approveAt,
                violation=first.violation
            )

            result.append(response)

        return result
    
    async def send_report(self, req: SendReportRequest) -> Optional[SendReportResponse]:
        rs = await ReportRepository.insert(req.model_dump())
        if rs:
            return SendReportResponse(success=True, message="Ok")
        return SendReportResponse(success=False, message="Error")
    
    async def get_report_of_day(self, req: GetReportOfDayRequest) -> GetReportOfDayResponse:
        rs = await ReportRepository.get_report_of_day()
        return GetReportOfDayResponse(success=True, data=rs)
    
    async def get_top_report(self, req: GetTopReportRequest) -> GetTopReportReponse:
        print("ahkkk")
        rs_dic = await ReportRepository.get_reports_in_day(datetime.now())
        rs: List[TopReport] = []
        for dic in rs_dic:
            rp: TopReport = TopReport(**bson_to_dict(dic))
            rs.append(rp)
            print(rp)
        return GetTopReportReponse(success=True, data=rs)

        
    
        
    

            
